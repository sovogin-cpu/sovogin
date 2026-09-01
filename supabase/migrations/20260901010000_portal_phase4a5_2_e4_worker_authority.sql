BEGIN;

-- ============================================================================
-- SOVOGIN PORTAL — PHASE 4A5.2-E4.2-C
-- Dedicated Worker Authority & Least-Privilege Capability Foundation
-- ============================================================================

-- 1. Create Dedicated Capability Table for Granular Permission Assignment
CREATE TABLE IF NOT EXISTS public.profile_capabilities (
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    capability TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT pk_profile_capabilities PRIMARY KEY (profile_id, capability),
    CONSTRAINT chk_profile_capabilities_name CHECK (capability IN ('notification_delivery_worker'))
);

ALTER TABLE public.profile_capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view profile capabilities" ON public.profile_capabilities;
CREATE POLICY "Admins can view profile capabilities"
    ON public.profile_capabilities FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can manage profile capabilities" ON public.profile_capabilities;
CREATE POLICY "Admins can manage profile capabilities"
    ON public.profile_capabilities FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 2. Centralized Security Definer Authorization Helper
CREATE OR REPLACE FUNCTION public.can_execute_notification_delivery()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
    v_has_capability BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Admins inherit delivery execution authority
    IF v_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- Dedicated workers with notification_delivery_worker capability
    SELECT EXISTS (
        SELECT 1 FROM public.profile_capabilities
        WHERE profile_id = auth.uid()
          AND capability = 'notification_delivery_worker'
    ) INTO v_has_capability;

    RETURN v_has_capability;
END;
$$;

-- Restrict direct external invocation of helper function; used strictly internally by delivery RPCs
REVOKE ALL ON FUNCTION public.can_execute_notification_delivery() FROM PUBLIC, anon, authenticated;

-- 3. Update the 7 Delivery Lifecycle RPCs to use Centralized Helper

-- 3.1 claim_notification_for_delivery
DROP FUNCTION IF EXISTS public.claim_notification_for_delivery(UUID);
CREATE OR REPLACE FUNCTION public.claim_notification_for_delivery(
    p_event_id UUID
)
RETURNS TABLE (
    event_id UUID,
    claim_token UUID,
    claim_expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_claim_token UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    IF NOT public.can_execute_notification_delivery() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Delivery worker or admin authorization required.';
    END IF;

    v_claim_token := gen_random_uuid();
    v_expires_at := clock_timestamp() + interval '5 minutes';

    UPDATE public.collection_notification_events e
    SET status = 'PROCESSING',
        claim_token = v_claim_token,
        claimed_at = clock_timestamp(),
        claim_expires_at = v_expires_at,
        updated_at = clock_timestamp()
    WHERE e.id = p_event_id
      AND (
        e.status = 'QUEUED'
        OR (e.status = 'PROCESSING' AND e.claim_expires_at < clock_timestamp())
      )
      AND (e.scheduled_for <= clock_timestamp())
      AND (e.next_retry_at IS NULL OR e.next_retry_at <= clock_timestamp());

    IF NOT FOUND THEN
        SELECT e.next_retry_at INTO v_expires_at
        FROM public.collection_notification_events e
        WHERE e.id = p_event_id;

        IF FOUND AND v_expires_at IS NOT NULL AND v_expires_at > clock_timestamp() THEN
            RAISE EXCEPTION 'RETRY_BACKOFF_ACTIVE: Notification event is in backoff window until %', v_expires_at;
        END IF;

        RAISE EXCEPTION 'NOT_FOUND_OR_NOT_CLAIMABLE: Notification event not found or not claimable.';
    END IF;

    RETURN QUERY SELECT p_event_id, v_claim_token, v_expires_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_notification_for_delivery(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_notification_for_delivery(UUID) TO authenticated;

-- 3.2 suppress_notification_delivery
DROP FUNCTION IF EXISTS public.suppress_notification_delivery(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.suppress_notification_delivery(
    p_event_id UUID,
    p_claim_token UUID,
    p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_affected INT;
BEGIN
    IF NOT public.can_execute_notification_delivery() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Delivery worker or admin authorization required.';
    END IF;

    UPDATE public.collection_notification_events e
    SET status = 'SUPPRESSED',
        suppression_reason = p_reason,
        claim_token = NULL,
        claimed_at = NULL,
        claim_expires_at = NULL,
        updated_at = clock_timestamp()
    WHERE e.id = p_event_id
      AND e.status = 'PROCESSING'
      AND e.claim_token = p_claim_token
      AND e.claim_expires_at >= clock_timestamp();

    GET DIAGNOSTICS v_affected = ROW_COUNT;
    IF v_affected = 0 THEN
        RAISE EXCEPTION 'STALE_CLAIM_FENCING_ERROR: Stale claim token or expired lease.';
    END IF;

    RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.suppress_notification_delivery(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suppress_notification_delivery(UUID, UUID, TEXT) TO authenticated;

-- 3.3 start_notification_delivery
DROP FUNCTION IF EXISTS public.start_notification_delivery(UUID, UUID);
DROP FUNCTION IF EXISTS public.start_notification_delivery(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.start_notification_delivery(
    p_event_id UUID,
    p_claim_token UUID,
    p_provider TEXT DEFAULT 'resend'
)
RETURNS TABLE (
    attempt_id UUID,
    event_id UUID,
    attempt_number INT,
    provider_idempotency_key TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_parent_status TEXT;
    v_parent_token UUID;
    v_parent_expires TIMESTAMPTZ;
    v_parent_attempts INT;
    v_parent_channel TEXT;
    v_open_attempt_status TEXT;
    v_next_attempt_number INT;
    v_idempotency_key TEXT;
    v_attempt_id UUID;
BEGIN
    IF NOT public.can_execute_notification_delivery() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Delivery worker or admin authorization required.';
    END IF;

    SELECT e.status, e.claim_token, e.claim_expires_at, e.attempt_count, e.channel
    INTO v_parent_status, v_parent_token, v_parent_expires, v_parent_attempts, v_parent_channel
    FROM public.collection_notification_events e
    WHERE e.id = p_event_id
    FOR UPDATE;

    IF v_parent_status IS NULL THEN
        RAISE EXCEPTION 'NOT_FOUND: Notification event % not found.', p_event_id;
    END IF;

    IF v_parent_token IS DISTINCT FROM p_claim_token OR v_parent_expires < clock_timestamp() THEN
        RAISE EXCEPTION 'STALE_CLAIM_FENCING_ERROR: Stale claim token or expired lease.';
    END IF;

    SELECT a.status INTO v_open_attempt_status
    FROM public.collection_notification_delivery_attempts a
    WHERE a.event_id = p_event_id AND a.status IN ('PROCESSING', 'UNKNOWN_OUTCOME');

    IF v_open_attempt_status IS NOT NULL THEN
        RAISE EXCEPTION 'INVALID_ATTEMPT_STATE: Event already has an open delivery attempt in % status.', v_open_attempt_status;
    END IF;

    v_next_attempt_number := v_parent_attempts + 1;
    v_idempotency_key := p_event_id::text || ':' || v_next_attempt_number::text;

    UPDATE public.collection_notification_events e
    SET attempt_count = v_next_attempt_number,
        last_attempt_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE e.id = p_event_id;

    INSERT INTO public.collection_notification_delivery_attempts (
        event_id,
        attempt_number,
        dispatch_count,
        claim_token,
        channel,
        provider,
        provider_idempotency_key,
        started_at,
        last_dispatched_at,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_event_id,
        v_next_attempt_number,
        1,
        p_claim_token,
        v_parent_channel,
        p_provider,
        v_idempotency_key,
        clock_timestamp(),
        clock_timestamp(),
        'PROCESSING',
        clock_timestamp(),
        clock_timestamp()
    )
    RETURNING id INTO v_attempt_id;

    RETURN QUERY SELECT v_attempt_id, p_event_id, v_next_attempt_number, v_idempotency_key;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_notification_delivery(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_notification_delivery(UUID, UUID, TEXT) TO authenticated;

-- 3.4 recover_expired_notification_delivery
DROP FUNCTION IF EXISTS public.recover_expired_notification_delivery(UUID, UUID, UUID);
CREATE OR REPLACE FUNCTION public.recover_expired_notification_delivery(
    p_event_id UUID,
    p_attempt_id UUID,
    p_claim_token UUID
)
RETURNS TABLE (
    attempt_id UUID,
    event_id UUID,
    attempt_number INT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_attempt_status TEXT;
    v_attempt_number INT;
BEGIN
    IF NOT public.can_execute_notification_delivery() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Delivery worker or admin authorization required.';
    END IF;

    SELECT a.status, a.attempt_number INTO v_attempt_status, v_attempt_number
    FROM public.collection_notification_delivery_attempts a
    WHERE a.id = p_attempt_id AND a.event_id = p_event_id
    FOR UPDATE;

    IF v_attempt_status IS DISTINCT FROM 'PROCESSING' THEN
        RAISE EXCEPTION 'INVALID_ATTEMPT_STATE: Attempt is not in PROCESSING status.';
    END IF;

    UPDATE public.collection_notification_delivery_attempts
    SET status = 'UNKNOWN_OUTCOME',
        failure_class = 'UNKNOWN_OUTCOME',
        error_code = 'LEASE_EXPIRED_RECOVERY',
        error_message = 'Worker lease expired while attempt was in PROCESSING status',
        updated_at = clock_timestamp()
    WHERE id = p_attempt_id;

    RETURN QUERY SELECT p_attempt_id, p_event_id, v_attempt_number, 'UNKNOWN_OUTCOME'::text;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recover_expired_notification_delivery(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recover_expired_notification_delivery(UUID, UUID, UUID) TO authenticated;

-- 3.5 resume_unknown_notification_delivery
DROP FUNCTION IF EXISTS public.resume_unknown_notification_delivery(UUID, UUID, UUID);
CREATE OR REPLACE FUNCTION public.resume_unknown_notification_delivery(
    p_event_id UUID,
    p_attempt_id UUID,
    p_claim_token UUID
)
RETURNS TABLE (
    attempt_id UUID,
    event_id UUID,
    attempt_number INT,
    dispatch_count INT,
    provider_idempotency_key TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_parent_status TEXT;
    v_parent_token UUID;
    v_parent_expires TIMESTAMPTZ;
    v_attempt_status TEXT;
    v_attempt_number INT;
    v_dispatch_count INT;
    v_idempotency_key TEXT;
BEGIN
    IF NOT public.can_execute_notification_delivery() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Delivery worker or admin authorization required.';
    END IF;

    SELECT e.status, e.claim_token, e.claim_expires_at
    INTO v_parent_status, v_parent_token, v_parent_expires
    FROM public.collection_notification_events e
    WHERE e.id = p_event_id
    FOR UPDATE;

    IF v_parent_token IS DISTINCT FROM p_claim_token OR v_parent_expires < clock_timestamp() THEN
        RAISE EXCEPTION 'STALE_CLAIM_FENCING_ERROR: Claim lease has expired.';
    END IF;

    SELECT a.status, a.attempt_number, a.dispatch_count, a.provider_idempotency_key
    INTO v_attempt_status, v_attempt_number, v_dispatch_count, v_idempotency_key
    FROM public.collection_notification_delivery_attempts a
    WHERE a.id = p_attempt_id AND a.event_id = p_event_id
    FOR UPDATE;

    IF v_attempt_status IS DISTINCT FROM 'UNKNOWN_OUTCOME' THEN
        RAISE EXCEPTION 'INVALID_ATTEMPT_STATE: Attempt is not in UNKNOWN_OUTCOME status.';
    END IF;

    v_dispatch_count := v_dispatch_count + 1;

    UPDATE public.collection_notification_delivery_attempts
    SET status = 'PROCESSING',
        claim_token = p_claim_token,
        dispatch_count = v_dispatch_count,
        last_dispatched_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = p_attempt_id;

    RETURN QUERY
    SELECT p_attempt_id, p_event_id, v_attempt_number, v_dispatch_count, v_idempotency_key;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resume_unknown_notification_delivery(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resume_unknown_notification_delivery(UUID, UUID, UUID) TO authenticated;

-- 3.6 complete_notification_delivery
DROP FUNCTION IF EXISTS public.complete_notification_delivery(UUID, UUID, UUID, TEXT, INT, INT);
CREATE OR REPLACE FUNCTION public.complete_notification_delivery(
    p_event_id UUID,
    p_claim_token UUID,
    p_attempt_id UUID,
    p_provider_message_id TEXT,
    p_provider_status_code INT DEFAULT 200,
    p_latency_ms INT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_affected INT;
BEGIN
    IF NOT public.can_execute_notification_delivery() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Delivery worker or admin authorization required.';
    END IF;

    UPDATE public.collection_notification_events e
    SET status = 'SENT',
        provider_message_id = p_provider_message_id,
        sent_at = clock_timestamp(),
        claim_token = NULL,
        claimed_at = NULL,
        claim_expires_at = NULL,
        updated_at = clock_timestamp()
    WHERE e.id = p_event_id
      AND e.status = 'PROCESSING'
      AND e.claim_token = p_claim_token
      AND e.claim_expires_at >= clock_timestamp();

    GET DIAGNOSTICS v_affected = ROW_COUNT;
    IF v_affected = 0 THEN
        RAISE EXCEPTION 'STALE_CLAIM_FENCING_ERROR: Stale claim token or expired lease.';
    END IF;

    UPDATE public.collection_notification_delivery_attempts a
    SET status = 'SUCCESS',
        completed_at = clock_timestamp(),
        provider_message_id = p_provider_message_id,
        provider_status_code = p_provider_status_code,
        latency_ms = p_latency_ms,
        updated_at = clock_timestamp()
    WHERE a.id = p_attempt_id AND a.event_id = p_event_id;

    RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_notification_delivery(UUID, UUID, UUID, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_notification_delivery(UUID, UUID, UUID, TEXT, INT, INT) TO authenticated;

-- 3.7 fail_notification_delivery
DROP FUNCTION IF EXISTS public.fail_notification_delivery(UUID, UUID, UUID, TEXT, TEXT, TEXT, INT, INT);
CREATE OR REPLACE FUNCTION public.fail_notification_delivery(
    p_event_id UUID,
    p_claim_token UUID,
    p_attempt_id UUID,
    p_failure_class TEXT,
    p_error_code TEXT,
    p_error_message TEXT,
    p_provider_status_code INT DEFAULT NULL,
    p_latency_ms INT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_parent_attempts INT;
    v_is_transient BOOLEAN;
    v_backoff_minutes INT;
BEGIN
    IF NOT public.can_execute_notification_delivery() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Delivery worker or admin authorization required.';
    END IF;

    SELECT e.attempt_count INTO v_parent_attempts
    FROM public.collection_notification_events e
    WHERE e.id = p_event_id AND e.status = 'PROCESSING' AND e.claim_token = p_claim_token AND e.claim_expires_at >= clock_timestamp()
    FOR UPDATE;

    IF v_parent_attempts IS NULL THEN
        RAISE EXCEPTION 'STALE_CLAIM_FENCING_ERROR: Stale claim token or expired lease.';
    END IF;

    IF p_failure_class = 'UNKNOWN_OUTCOME' THEN
        UPDATE public.collection_notification_delivery_attempts a
        SET status = 'UNKNOWN_OUTCOME',
            failure_class = p_failure_class,
            error_code = p_error_code,
            error_message = p_error_message,
            provider_status_code = p_provider_status_code,
            latency_ms = p_latency_ms,
            updated_at = clock_timestamp()
        WHERE a.id = p_attempt_id AND a.event_id = p_event_id;

        RETURN TRUE;
    END IF;

    v_is_transient := (p_failure_class IN ('TRANSIENT', 'RATE_LIMITED') AND v_parent_attempts < 3);

    UPDATE public.collection_notification_delivery_attempts a
    SET status = 'FAILED',
        completed_at = clock_timestamp(),
        failure_class = p_failure_class,
        error_code = p_error_code,
        error_message = p_error_message,
        provider_status_code = p_provider_status_code,
        latency_ms = p_latency_ms,
        updated_at = clock_timestamp()
    WHERE a.id = p_attempt_id AND a.event_id = p_event_id;

    IF v_is_transient THEN
        v_backoff_minutes := CASE WHEN v_parent_attempts = 1 THEN 5 ELSE 15 END;

        UPDATE public.collection_notification_events e
        SET status = 'QUEUED',
            next_retry_at = clock_timestamp() + (v_backoff_minutes || ' minutes')::interval,
            failure_reason = p_error_message,
            claim_token = NULL,
            claimed_at = NULL,
            claim_expires_at = NULL,
            updated_at = clock_timestamp()
        WHERE e.id = p_event_id;
    ELSE
        UPDATE public.collection_notification_events e
        SET status = 'FAILED',
            failure_reason = p_error_message,
            claim_token = NULL,
            claimed_at = NULL,
            claim_expires_at = NULL,
            updated_at = clock_timestamp()
        WHERE e.id = p_event_id;
    END IF;

    RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fail_notification_delivery(UUID, UUID, UUID, TEXT, TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fail_notification_delivery(UUID, UUID, UUID, TEXT, TEXT, TEXT, INT, INT) TO authenticated;

COMMIT;

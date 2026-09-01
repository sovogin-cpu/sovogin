-- ============================================================================
-- SOVOGIN — FASE 4A5.2-E4.2-A: DELIVERY PERSISTENCE & ATOMIC RPC FOUNDATION
-- Migration for Delivery Attempts, State Machine Hardening, Fencing & RPCs
-- ============================================================================

-- Stage A1: Catalog & Schema Updates on collection_notification_events
ALTER TABLE public.collection_notification_events
    ALTER COLUMN attempt_count SET DEFAULT 0;

ALTER TABLE public.collection_notification_events
    DROP CONSTRAINT IF EXISTS collection_notification_events_attempt_count_check;

ALTER TABLE public.collection_notification_events
    ADD CONSTRAINT collection_notification_events_attempt_count_check
    CHECK (attempt_count >= 0);

ALTER TABLE public.collection_notification_events
    DROP CONSTRAINT IF EXISTS collection_notification_events_status_check;

ALTER TABLE public.collection_notification_events
    ADD CONSTRAINT collection_notification_events_status_check
    CHECK (status IN (
        'QUEUED', 'PROCESSING', 'SENT', 'DELIVERED',
        'BOUNCED', 'COMPLAINED', 'FAILED', 'SUPPRESSED', 'RECONCILIATION_REQUIRED'
    ));

ALTER TABLE public.collection_notification_events
    ADD COLUMN IF NOT EXISTS claim_token UUID,
    ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS claim_expires_at TIMESTAMPTZ;

-- Stage A2: Append-Only Operational Table for Logical Delivery Attempts
CREATE TABLE IF NOT EXISTS public.collection_notification_delivery_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.collection_notification_events(id) ON DELETE RESTRICT,
    attempt_number INT NOT NULL CHECK (attempt_number >= 1),
    dispatch_count INT NOT NULL DEFAULT 1 CHECK (dispatch_count >= 1),
    claim_token UUID NOT NULL,
    channel TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_idempotency_key TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    last_dispatched_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('PROCESSING', 'UNKNOWN_OUTCOME', 'SUCCESS', 'FAILED', 'SUPPRESSED')),
    provider_status_code INT,
    provider_message_id TEXT,
    error_code TEXT,
    error_message TEXT,
    failure_class TEXT CHECK (failure_class IN ('TRANSIENT', 'PERMANENT', 'UNKNOWN_OUTCOME', 'RATE_LIMITED', 'AUTH_CONFIGURATION', 'PAYLOAD_VALIDATION')),
    latency_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_delivery_attempt_number UNIQUE (event_id, attempt_number),
    CONSTRAINT uq_delivery_idempotency_key UNIQUE (provider_idempotency_key)
);

ALTER TABLE public.collection_notification_delivery_attempts
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp();

-- Defense-in-depth Partial Unique Index: Max 1 Open Attempt Per Event
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_open_attempt_per_event
    ON public.collection_notification_delivery_attempts(event_id)
    WHERE status IN ('PROCESSING', 'UNKNOWN_OUTCOME');

CREATE INDEX IF NOT EXISTS idx_delivery_attempts_event_id
    ON public.collection_notification_delivery_attempts(event_id, attempt_number DESC);

-- Stage A3: RLS Security Policies
-- Revoke generic direct UPDATE policy on collection_notification_events
DROP POLICY IF EXISTS "Admins can update collection_notification_events" ON public.collection_notification_events;

-- Enable RLS on delivery attempts table
ALTER TABLE public.collection_notification_delivery_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view collection_notification_delivery_attempts" ON public.collection_notification_delivery_attempts;
CREATE POLICY "Admins can view collection_notification_delivery_attempts"
    ON public.collection_notification_delivery_attempts
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Stage A4: Security Definer RPCs

-- 1. claim_notification_for_delivery
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
    v_lease_seconds INT := 300; -- Fixed 5 minutes server authority lease
    v_profile_role TEXT;
    v_event_status TEXT;
    v_next_retry_at TIMESTAMPTZ;
    v_scheduled_for TIMESTAMPTZ;
    v_claim_expires_at TIMESTAMPTZ;
    v_target_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Unauthenticated caller.';
    END IF;

    SELECT role INTO v_profile_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_profile_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Admin authorization required.';
    END IF;

    -- Atomic Lock with SKIP LOCKED
    SELECT e.id, e.status, e.next_retry_at, e.scheduled_for, e.claim_expires_at
    INTO v_target_id, v_event_status, v_next_retry_at, v_scheduled_for, v_claim_expires_at
    FROM public.collection_notification_events e
    WHERE e.id = p_event_id
    FOR UPDATE SKIP LOCKED;

    IF v_target_id IS NULL THEN
        -- Distinguish active retry backoff fail-closed vs missing/concurrent loser
        SELECT e.status, e.next_retry_at INTO v_event_status, v_next_retry_at
        FROM public.collection_notification_events e
        WHERE e.id = p_event_id;

        IF v_event_status = 'QUEUED' AND v_next_retry_at IS NOT NULL AND v_next_retry_at > clock_timestamp() THEN
            RAISE EXCEPTION 'RETRY_BACKOFF_ACTIVE: Event is in retry backoff until %', v_next_retry_at;
        END IF;

        RETURN;
    END IF;

    -- Row locked. Check status eligibility
    IF v_event_status = 'QUEUED' THEN
        IF v_next_retry_at IS NOT NULL AND v_next_retry_at > clock_timestamp() THEN
            RAISE EXCEPTION 'RETRY_BACKOFF_ACTIVE: Event is in retry backoff until %', v_next_retry_at;
        END IF;

        IF v_scheduled_for IS NOT NULL AND v_scheduled_for > clock_timestamp() THEN
            RETURN;
        END IF;
    ELSIF v_event_status = 'PROCESSING' THEN
        IF v_claim_expires_at IS NULL OR v_claim_expires_at >= clock_timestamp() THEN
            RETURN;
        END IF;
    ELSE
        RETURN;
    END IF;

    v_claim_token := gen_random_uuid();

    UPDATE public.collection_notification_events target
    SET status = 'PROCESSING',
        claim_token = v_claim_token,
        claimed_at = clock_timestamp(),
        claim_expires_at = clock_timestamp() + (v_lease_seconds || ' seconds')::interval,
        updated_at = clock_timestamp()
    WHERE target.id = p_event_id
    RETURNING target.id, target.claim_token, target.claim_expires_at
    INTO event_id, claim_token, claim_expires_at;

    RETURN NEXT;
END;
$$;

-- 2. suppress_notification_delivery
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
    v_profile_role TEXT;
    v_affected INT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Unauthenticated caller.';
    END IF;

    SELECT role INTO v_profile_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_profile_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Admin authorization required.';
    END IF;

    -- Reject suppression if an attempt has already been initiated
    IF EXISTS (
        SELECT 1 FROM public.collection_notification_delivery_attempts
        WHERE event_id = p_event_id
    ) THEN
        RAISE EXCEPTION 'SUPPRESSION_NOT_ALLOWED: Cannot suppress event after delivery attempt has been initiated.';
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
      AND e.claim_expires_at >= clock_timestamp()
      AND e.attempt_count = 0;

    GET DIAGNOSTICS v_affected = ROW_COUNT;
    IF v_affected = 0 THEN
        RAISE EXCEPTION 'STALE_CLAIM_FENCING_ERROR: Stale claim token, expired lease, or attempt already exists.';
    END IF;

    RETURN TRUE;
END;
$$;

-- 3. start_notification_delivery
DROP FUNCTION IF EXISTS public.start_notification_delivery(UUID, UUID);

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
    v_profile_role TEXT;
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
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Unauthenticated caller.';
    END IF;

    SELECT role INTO v_profile_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_profile_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Admin authorization required.';
    END IF;

    -- Lock parent event
    SELECT e.status, e.claim_token, e.claim_expires_at, e.attempt_count, e.channel
    INTO v_parent_status, v_parent_token, v_parent_expires, v_parent_attempts, v_parent_channel
    FROM public.collection_notification_events e
    WHERE e.id = p_event_id
    FOR UPDATE;

    IF v_parent_status IS DISTINCT FROM 'PROCESSING' OR v_parent_token IS DISTINCT FROM p_claim_token THEN
        RAISE EXCEPTION 'STALE_CLAIM_FENCING_ERROR: Stale claim token or invalid status.';
    END IF;

    IF v_parent_expires < clock_timestamp() THEN
        RAISE EXCEPTION 'STALE_CLAIM_FENCING_ERROR: Claim lease has expired.';
    END IF;

    -- Open attempt guard
    SELECT a.status INTO v_open_attempt_status
    FROM public.collection_notification_delivery_attempts a
    WHERE a.event_id = p_event_id AND a.status IN ('PROCESSING', 'UNKNOWN_OUTCOME')
    LIMIT 1;

    IF v_open_attempt_status = 'PROCESSING' THEN
        RAISE EXCEPTION 'OPEN_ATTEMPT_REQUIRES_RECOVERY: An unresolved PROCESSING attempt exists.';
    ELSIF v_open_attempt_status = 'UNKNOWN_OUTCOME' THEN
        RAISE EXCEPTION 'UNKNOWN_OUTCOME_REQUIRES_RESUME: An unresolved UNKNOWN_OUTCOME attempt exists.';
    END IF;

    v_next_attempt_number := v_parent_attempts + 1;
    v_idempotency_key := p_event_id::TEXT || ':' || v_next_attempt_number::TEXT;
    v_attempt_id := gen_random_uuid();

    -- Increment parent attempt_count and update timestamps
    UPDATE public.collection_notification_events
    SET attempt_count = v_next_attempt_number,
        last_attempt_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = p_event_id;

    -- Insert new delivery attempt
    INSERT INTO public.collection_notification_delivery_attempts (
        id, event_id, attempt_number, dispatch_count, claim_token, channel, provider, provider_idempotency_key, started_at, last_dispatched_at, status, created_at, updated_at
    ) VALUES (
        v_attempt_id, p_event_id, v_next_attempt_number, 1, p_claim_token, v_parent_channel, COALESCE(p_provider, 'resend'), v_idempotency_key, clock_timestamp(), clock_timestamp(), 'PROCESSING', clock_timestamp(), clock_timestamp()
    );

    RETURN QUERY
    SELECT v_attempt_id, p_event_id, v_next_attempt_number, v_idempotency_key;
END;
$$;

-- 4. recover_expired_notification_delivery
CREATE OR REPLACE FUNCTION public.recover_expired_notification_delivery(
    p_event_id UUID,
    p_attempt_id UUID,
    p_claim_token UUID
)
RETURNS TABLE (
    event_id UUID,
    attempt_id UUID,
    attempt_number INT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_profile_role TEXT;
    v_parent_status TEXT;
    v_parent_token UUID;
    v_parent_expires TIMESTAMPTZ;
    v_attempt_status TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Unauthenticated caller.';
    END IF;

    SELECT role INTO v_profile_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_profile_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Admin authorization required.';
    END IF;

    SELECT e.status, e.claim_token, e.claim_expires_at
    INTO v_parent_status, v_parent_token, v_parent_expires
    FROM public.collection_notification_events e
    WHERE e.id = p_event_id
    FOR UPDATE;

    IF v_parent_status IS DISTINCT FROM 'PROCESSING' OR v_parent_token IS DISTINCT FROM p_claim_token THEN
        RAISE EXCEPTION 'STALE_CLAIM_FENCING_ERROR: Stale claim token or invalid parent status.';
    END IF;

    IF v_parent_expires < clock_timestamp() THEN
        RAISE EXCEPTION 'STALE_CLAIM_FENCING_ERROR: Claim lease has expired.';
    END IF;

    SELECT a.status INTO v_attempt_status
    FROM public.collection_notification_delivery_attempts a
    WHERE a.id = p_attempt_id AND a.event_id = p_event_id
    FOR UPDATE;

    IF v_attempt_status IS DISTINCT FROM 'PROCESSING' THEN
        RAISE EXCEPTION 'INVALID_ATTEMPT_STATE: Attempt is not in PROCESSING status.';
    END IF;

    UPDATE public.collection_notification_delivery_attempts
    SET status = 'UNKNOWN_OUTCOME',
        claim_token = p_claim_token,
        failure_class = 'UNKNOWN_OUTCOME',
        error_code = 'LEASE_EXPIRED_PROCESSING',
        error_message = 'Lease expired while in PROCESSING. Converted to UNKNOWN_OUTCOME for safe recovery.',
        updated_at = clock_timestamp()
    WHERE id = p_attempt_id;

    RETURN QUERY
    SELECT p_event_id, p_attempt_id, a.attempt_number, a.status
    FROM public.collection_notification_delivery_attempts a
    WHERE a.id = p_attempt_id;
END;
$$;

-- 5. resume_unknown_notification_delivery
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
    v_profile_role TEXT;
    v_parent_status TEXT;
    v_parent_token UUID;
    v_parent_expires TIMESTAMPTZ;
    v_attempt_status TEXT;
    v_attempt_number INT;
    v_dispatch_count INT;
    v_idempotency_key TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Unauthenticated caller.';
    END IF;

    SELECT role INTO v_profile_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_profile_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Admin authorization required.';
    END IF;

    SELECT e.status, e.claim_token, e.claim_expires_at
    INTO v_parent_status, v_parent_token, v_parent_expires
    FROM public.collection_notification_events e
    WHERE e.id = p_event_id
    FOR UPDATE;

    IF v_parent_status IS DISTINCT FROM 'PROCESSING' OR v_parent_token IS DISTINCT FROM p_claim_token THEN
        RAISE EXCEPTION 'STALE_CLAIM_FENCING_ERROR: Stale claim token or invalid parent status.';
    END IF;

    IF v_parent_expires < clock_timestamp() THEN
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

-- 6. complete_notification_delivery
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
    v_profile_role TEXT;
    v_affected INT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Unauthenticated caller.';
    END IF;

    SELECT role INTO v_profile_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_profile_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Admin authorization required.';
    END IF;

    -- Update parent event
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

    -- Update delivery attempt
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

-- 7. fail_notification_delivery
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
    v_profile_role TEXT;
    v_parent_attempts INT;
    v_affected INT;
    v_is_transient BOOLEAN;
    v_backoff_minutes INT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Unauthenticated caller.';
    END IF;

    SELECT role INTO v_profile_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_profile_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Admin authorization required.';
    END IF;

    -- Lock parent
    SELECT e.attempt_count INTO v_parent_attempts
    FROM public.collection_notification_events e
    WHERE e.id = p_event_id AND e.status = 'PROCESSING' AND e.claim_token = p_claim_token AND e.claim_expires_at >= clock_timestamp()
    FOR UPDATE;

    IF v_parent_attempts IS NULL THEN
        RAISE EXCEPTION 'STALE_CLAIM_FENCING_ERROR: Stale claim token or expired lease.';
    END IF;

    IF p_failure_class = 'UNKNOWN_OUTCOME' THEN
        -- Mark attempt as UNKNOWN_OUTCOME, keep parent in PROCESSING for recovery
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

    -- Mark attempt as FAILED
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

-- Revoke execute from public & grant to authenticated
REVOKE EXECUTE ON FUNCTION public.claim_notification_for_delivery(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_notification_for_delivery(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.suppress_notification_delivery(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suppress_notification_delivery(UUID, UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.start_notification_delivery(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_notification_delivery(UUID, UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.recover_expired_notification_delivery(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recover_expired_notification_delivery(UUID, UUID, UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.resume_unknown_notification_delivery(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resume_unknown_notification_delivery(UUID, UUID, UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.complete_notification_delivery(UUID, UUID, UUID, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_notification_delivery(UUID, UUID, UUID, TEXT, INT, INT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fail_notification_delivery(UUID, UUID, UUID, TEXT, TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fail_notification_delivery(UUID, UUID, UUID, TEXT, TEXT, TEXT, INT, INT) TO authenticated;

-- Stage B: Surgical Correction Block for Existing Production Historical Event
DO $$
DECLARE
    v_affected_rows INT;
BEGIN
    UPDATE public.collection_notification_events
    SET attempt_count = 0,
        updated_at = clock_timestamp()
    WHERE id = 'fb599e91-dfd3-4080-a6b3-cfd02ff07be9'::uuid
      AND attempt_count = 1
      AND status = 'QUEUED'
      AND sent_at IS NULL
      AND provider_message_id IS NULL
      AND last_attempt_at IS NULL
      AND next_retry_at IS NULL
      AND failure_reason IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.collection_notification_delivery_attempts
        WHERE event_id = 'fb599e91-dfd3-4080-a6b3-cfd02ff07be9'::uuid
      );

    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

    IF v_affected_rows <> 1 THEN
        RAISE EXCEPTION 'Safety Violation: Production event correction expected exactly 1 row, but affected % rows. Rolling back transaction.', v_affected_rows;
    END IF;
END $$;

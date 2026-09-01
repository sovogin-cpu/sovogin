-- ============================================================================
-- SOVOGIN — FASE 4A5.2-E4.2-E: SERVER-CONTROLLED NOTIFICATION EVENT SELECTOR
-- Migration for Atomic Single-Event Claim & Concurrency Locking (FOR UPDATE SKIP LOCKED)
-- Strictly selects QUEUED eligible events (Expired PROCESSING recovery remains under recover_expired_notification_delivery)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_next_notification_for_delivery()
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
    v_target_id UUID;
    v_claim_token UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- 1. Authorization Guard: Only worker identity or admin can execute delivery claim
    IF NOT public.can_execute_notification_delivery() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Delivery worker or admin authorization required.';
    END IF;

    -- 2. Select exactly ONE eligible QUEUED event atomically using FOR UPDATE SKIP LOCKED
    SELECT e.id INTO v_target_id
    FROM public.collection_notification_events e
    WHERE e.status = 'QUEUED'
      AND (e.scheduled_for <= clock_timestamp())
      AND (e.next_retry_at IS NULL OR e.next_retry_at <= clock_timestamp())
    ORDER BY e.scheduled_for ASC, e.created_at ASC, e.id ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    -- If no eligible event exists, return empty result set (NO_OP)
    IF v_target_id IS NULL THEN
        RETURN;
    END IF;

    -- 3. Perform atomic claim mutation on the selected QUEUED event
    v_claim_token := gen_random_uuid();
    v_expires_at := clock_timestamp() + interval '5 minutes';

    UPDATE public.collection_notification_events e
    SET status = 'PROCESSING',
        claim_token = v_claim_token,
        claimed_at = clock_timestamp(),
        claim_expires_at = v_expires_at,
        updated_at = clock_timestamp()
    WHERE e.id = v_target_id;

    RETURN QUERY SELECT v_target_id, v_claim_token, v_expires_at;
END;
$$;

-- Security Hardening: Restrict execution to authenticated users with worker capability
REVOKE EXECUTE ON FUNCTION public.claim_next_notification_for_delivery() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_next_notification_for_delivery() TO authenticated;

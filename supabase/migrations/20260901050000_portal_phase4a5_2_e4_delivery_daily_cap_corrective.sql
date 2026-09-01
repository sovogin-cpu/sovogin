BEGIN;

-- ============================================================================
-- SOVOGIN PORTAL — PHASE 4A5.2-E4.3
-- Daily Cap Dispatch-Count Corrective
-- Accurately counts actual provider dispatch invocations per UTC day
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_daily_delivery_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_attempt_dispatches INTEGER;
    v_legacy_sends INTEGER;
BEGIN
    -- Authorization FIRST
    IF NOT public.can_execute_notification_delivery() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Worker or admin authority required.';
    END IF;

    -- 1. Sum actual provider dispatch invocations occurring during current UTC day from delivery attempts table
    SELECT COALESCE(SUM(dispatch_count), 0)::INTEGER INTO v_attempt_dispatches
    FROM public.collection_notification_delivery_attempts
    WHERE last_dispatched_at >= (CURRENT_DATE AT TIME ZONE 'UTC')
      AND last_dispatched_at < ((CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'UTC')
      AND dispatch_count > 0;

    -- 2. Count legacy/historical SENT events without delivery attempt records for current UTC day
    SELECT COUNT(*)::INTEGER INTO v_legacy_sends
    FROM public.collection_notification_events e
    WHERE e.status = 'SENT'
      AND e.sent_at >= (CURRENT_DATE AT TIME ZONE 'UTC')
      AND e.sent_at < ((CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'UTC')
      AND NOT EXISTS (
          SELECT 1 FROM public.collection_notification_delivery_attempts a
          WHERE a.event_id = e.id
      );

    RETURN (v_attempt_dispatches + v_legacy_sends);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_daily_delivery_count() TO authenticated;

COMMIT;

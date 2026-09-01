BEGIN;

-- ============================================================================
-- SOVOGIN PORTAL — PHASE 4A5.2-E4.3
-- Delivery Scheduler Runs Audit Table + Durable Lease Table + Health Summary RPCs
-- ============================================================================

-- 1. Create Persistent Run Audit Table
CREATE TABLE IF NOT EXISTS public.collection_notification_delivery_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL DEFAULT 'scheduler',
    started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'RUNNING',
    claimed_count INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    suppressed_count INTEGER NOT NULL DEFAULT 0,
    transient_failure_count INTEGER NOT NULL DEFAULT 0,
    permanent_failure_count INTEGER NOT NULL DEFAULT 0,
    unknown_count INTEGER NOT NULL DEFAULT 0,
    technical_failure_count INTEGER NOT NULL DEFAULT 0,
    stop_reason TEXT,
    deployment_sha TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Enable RLS and deny public access by default
ALTER TABLE public.collection_notification_delivery_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read access on delivery runs"
    ON public.collection_notification_delivery_runs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
        )
    );


-- 2. Durable Singleton Scheduler Lease Table (Cross-request / Connection-Pool Safe)
CREATE TABLE IF NOT EXISTS public.collection_notification_delivery_scheduler_lock (
    lock_name TEXT PRIMARY KEY DEFAULT 'default',
    owner_run_id UUID,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.collection_notification_delivery_scheduler_lock ENABLE ROW LEVEL SECURITY;

-- Seed immutable singleton row if absent
INSERT INTO public.collection_notification_delivery_scheduler_lock (lock_name, owner_run_id, acquired_at, expires_at)
VALUES ('default', NULL, clock_timestamp(), clock_timestamp())
ON CONFLICT (lock_name) DO NOTHING;


-- 3. Atomic Lease Acquisition and Release RPCs
CREATE OR REPLACE FUNCTION public.try_acquire_delivery_scheduler_lease(
    p_run_id UUID,
    p_lease_seconds INTEGER DEFAULT 300
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_current RECORD;
    v_lease_duration INTERVAL;
BEGIN
    -- Authorization FIRST
    IF NOT public.can_execute_notification_delivery() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Worker or admin authority required.';
    END IF;

    IF p_run_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_RUN_ID: p_run_id parameter cannot be NULL.';
    END IF;

    -- Lease Duration Clamp (30s to 600s)
    IF p_lease_seconds IS NULL OR p_lease_seconds < 30 OR p_lease_seconds > 600 THEN
        RAISE EXCEPTION 'INVALID_LEASE_DURATION: p_lease_seconds must be between 30 and 600 seconds.';
    END IF;

    v_lease_duration := (p_lease_seconds || ' seconds')::interval;

    -- Lock singleton row for update
    SELECT lock_name, owner_run_id, expires_at
    INTO v_current
    FROM public.collection_notification_delivery_scheduler_lock
    WHERE lock_name = 'default'
    FOR UPDATE;

    -- Singleton row fallback initialization
    IF v_current.lock_name IS NULL THEN
        INSERT INTO public.collection_notification_delivery_scheduler_lock (
            lock_name,
            owner_run_id,
            acquired_at,
            expires_at
        ) VALUES (
            'default',
            p_run_id,
            clock_timestamp(),
            clock_timestamp() + v_lease_duration
        );
        RETURN TRUE;
    END IF;

    -- If active lease exists for another run, deny acquisition
    IF v_current.expires_at >= clock_timestamp() AND v_current.owner_run_id IS NOT NULL AND v_current.owner_run_id != p_run_id THEN
        RETURN FALSE;
    END IF;

    -- Acquire or extend lease
    UPDATE public.collection_notification_delivery_scheduler_lock
    SET owner_run_id = p_run_id,
        acquired_at = clock_timestamp(),
        expires_at = clock_timestamp() + v_lease_duration
    WHERE lock_name = 'default';

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_delivery_scheduler_lease(
    p_run_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    -- Authorization FIRST
    IF NOT public.can_execute_notification_delivery() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Worker or admin authority required.';
    END IF;

    IF p_run_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Only current owner run ID can release its lease
    UPDATE public.collection_notification_delivery_scheduler_lock
    SET expires_at = clock_timestamp()
    WHERE lock_name = 'default'
      AND owner_run_id = p_run_id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN (v_updated > 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_acquire_delivery_scheduler_lease(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_delivery_scheduler_lease(UUID) TO authenticated;


-- 4. Conservative Global Daily Cap Check RPC (Counts Evidence of Provider Dispatch)
CREATE OR REPLACE FUNCTION public.check_daily_delivery_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Authorization FIRST
    IF NOT public.can_execute_notification_delivery() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Worker or admin authority required.';
    END IF;

    SELECT COUNT(DISTINCT e.id)::INTEGER INTO v_count
    FROM public.collection_notification_events e
    LEFT JOIN public.collection_notification_delivery_attempts a ON a.event_id = e.id
    WHERE (
        (e.status = 'SENT' AND e.sent_at >= (CURRENT_DATE AT TIME ZONE 'UTC'))
        OR
        (a.created_at >= (CURRENT_DATE AT TIME ZONE 'UTC') AND (a.dispatch_count > 0 OR a.status IN ('SUCCESS', 'UNKNOWN_OUTCOME') OR a.provider_message_id IS NOT NULL))
    );

    RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_daily_delivery_count() TO authenticated;


-- 5. Audit Run Recording RPCs
CREATE OR REPLACE FUNCTION public.record_delivery_run_start(
    p_source TEXT,
    p_sha TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_run_id UUID;
BEGIN
    -- Authorization FIRST
    IF NOT public.can_execute_notification_delivery() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Worker or admin authority required.';
    END IF;

    INSERT INTO public.collection_notification_delivery_runs (
        source,
        deployment_sha,
        started_at,
        status
    )
    VALUES (
        COALESCE(p_source, 'scheduler'),
        p_sha,
        clock_timestamp(),
        'RUNNING'
    )
    RETURNING id INTO v_run_id;

    RETURN v_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_delivery_run_finish(
    p_run_id UUID,
    p_status TEXT,
    p_claimed INT,
    p_sent INT,
    p_suppressed INT,
    p_transient INT,
    p_permanent INT,
    p_unknown INT,
    p_technical INT,
    p_stop_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Authorization FIRST
    IF NOT public.can_execute_notification_delivery() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Worker or admin authority required.';
    END IF;

    UPDATE public.collection_notification_delivery_runs
    SET status = p_status,
        completed_at = clock_timestamp(),
        claimed_count = COALESCE(p_claimed, 0),
        sent_count = COALESCE(p_sent, 0),
        suppressed_count = COALESCE(p_suppressed, 0),
        transient_failure_count = COALESCE(p_transient, 0),
        permanent_failure_count = COALESCE(p_permanent, 0),
        unknown_count = COALESCE(p_unknown, 0),
        technical_failure_count = COALESCE(p_technical, 0),
        stop_reason = p_stop_reason
    WHERE id = p_run_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_delivery_run_start(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_delivery_run_finish(UUID, TEXT, INT, INT, INT, INT, INT, INT, INT, TEXT) TO authenticated;


-- 6. Admin Delivery Health Summary RPC
CREATE OR REPLACE FUNCTION public.get_delivery_health_summary()
RETURNS TABLE (
    queued_count INTEGER,
    eligible_queued_count INTEGER,
    processing_count INTEGER,
    sent_today_count INTEGER,
    suppressed_today_count INTEGER,
    failed_today_count INTEGER,
    unknown_outcome_count INTEGER,
    oldest_queued_age_hours NUMERIC,
    last_run_started_at TIMESTAMPTZ,
    last_run_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
    v_queued INT;
    v_eligible INT;
    v_processing INT;
    v_sent_today INT;
    v_suppressed_today INT;
    v_failed_today INT;
    v_unknown INT;
    v_oldest_age NUMERIC;
    v_last_run_time TIMESTAMPTZ;
    v_last_run_status TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
    END IF;

    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF v_role IS NULL OR v_role != 'admin' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Admin authority required.';
    END IF;

    SELECT COUNT(*)::INT INTO v_queued
    FROM public.collection_notification_events
    WHERE status = 'QUEUED';

    SELECT COUNT(*)::INT INTO v_eligible
    FROM public.collection_notification_events
    WHERE status = 'QUEUED' AND scheduled_for <= clock_timestamp();

    SELECT COUNT(*)::INT INTO v_processing
    FROM public.collection_notification_events
    WHERE status = 'PROCESSING';

    SELECT COUNT(*)::INT INTO v_sent_today
    FROM public.collection_notification_events
    WHERE status = 'SENT' AND sent_at >= (CURRENT_DATE AT TIME ZONE 'UTC');

    SELECT COUNT(*)::INT INTO v_suppressed_today
    FROM public.collection_notification_events
    WHERE status = 'SUPPRESSED' AND updated_at >= (CURRENT_DATE AT TIME ZONE 'UTC');

    SELECT COUNT(*)::INT INTO v_failed_today
    FROM public.collection_notification_events
    WHERE status = 'FAILED' AND updated_at >= (CURRENT_DATE AT TIME ZONE 'UTC');

    SELECT COUNT(*)::INT INTO v_unknown
    FROM public.collection_notification_delivery_attempts
    WHERE status = 'UNKNOWN_OUTCOME';

    SELECT COALESCE(EXTRACT(EPOCH FROM (clock_timestamp() - MIN(created_at))) / 3600.0, 0)::NUMERIC
    INTO v_oldest_age
    FROM public.collection_notification_events
    WHERE status = 'QUEUED';

    SELECT started_at, status
    INTO v_last_run_time, v_last_run_status
    FROM public.collection_notification_delivery_runs
    ORDER BY started_at DESC
    LIMIT 1;

    RETURN QUERY SELECT
        COALESCE(v_queued, 0),
        COALESCE(v_eligible, 0),
        COALESCE(v_processing, 0),
        COALESCE(v_sent_today, 0),
        COALESCE(v_suppressed_today, 0),
        COALESCE(v_failed_today, 0),
        COALESCE(v_unknown, 0),
        ROUND(COALESCE(v_oldest_age, 0), 2),
        v_last_run_time,
        v_last_run_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_health_summary() TO authenticated;

COMMIT;

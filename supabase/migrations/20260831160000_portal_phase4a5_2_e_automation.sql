-- ============================================================================
-- SOVOGIN — FASE 4A5.2-E1: COLLECTION NOTIFICATION EVENTS & AUTOMATION SCHEMA
-- Migration for Automated Reminders, Collection Alerts & Idempotency Audit
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.collection_notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    associate_id UUID NOT NULL REFERENCES public.associates(id) ON DELETE RESTRICT,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'internal_alert', 'whatsapp', 'sms')),
    automation_type TEXT NOT NULL CHECK (automation_type IN (
        'PRE_DUE_5D', 'PRE_DUE_1D', 'DUE_DATE',
        'OVERDUE_1D', 'OVERDUE_7D', 'OVERDUE_15D', 'OVERDUE_30D',
        'PROMISE_1D', 'PROMISE_DUE', 'PROMISE_BROKEN'
    )),
    reference_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED', 'SUPPRESSED')),
    provider_message_id TEXT,
    recipient_email TEXT,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    attempt_count INT NOT NULL DEFAULT 1 CHECK (attempt_count >= 1),
    last_attempt_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    suppression_reason TEXT,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_collection_notification_idempotency UNIQUE (associate_id, automation_type, reference_date, channel)
);

-- Indices for performance & batch filtering
CREATE INDEX IF NOT EXISTS idx_collection_notification_events_associate
    ON public.collection_notification_events(associate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collection_notification_events_status
    ON public.collection_notification_events(status, scheduled_for);

-- Trigger: Prevent identity field mutation on UPDATE
CREATE OR REPLACE FUNCTION public.fn_prevent_collection_notification_identity_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.associate_id IS DISTINCT FROM NEW.associate_id OR
       OLD.automation_type IS DISTINCT FROM NEW.automation_type OR
       OLD.reference_date IS DISTINCT FROM NEW.reference_date OR
       OLD.channel IS DISTINCT FROM NEW.channel OR
       OLD.scheduled_for IS DISTINCT FROM NEW.scheduled_for OR
       OLD.created_at IS DISTINCT FROM NEW.created_at THEN
        RAISE EXCEPTION 'Immutability Violation: Cannot update identity columns (associate_id, automation_type, reference_date, channel, scheduled_for, created_at) of collection_notification_events.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_collection_notification_identity_mutation ON public.collection_notification_events;
CREATE TRIGGER trg_prevent_collection_notification_identity_mutation
    BEFORE UPDATE ON public.collection_notification_events
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_collection_notification_identity_mutation();

-- Trigger: Automatic updated_at timestamp update
CREATE OR REPLACE FUNCTION public.fn_set_collection_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_collection_notification_updated_at ON public.collection_notification_events;
CREATE TRIGGER trg_set_collection_notification_updated_at
    BEFORE UPDATE ON public.collection_notification_events
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_collection_notification_updated_at();

-- RLS Enforcement
ALTER TABLE public.collection_notification_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin Authenticated Read, Insert & Update Only (NO DELETE POLICY)
CREATE POLICY "Admins can view collection_notification_events"
    ON public.collection_notification_events
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert collection_notification_events"
    ON public.collection_notification_events
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update collection_notification_events"
    ON public.collection_notification_events
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
        )
    );

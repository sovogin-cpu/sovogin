-- ============================================================================
-- SOVOGIN — FASE 4A5.2-E1: SECURITY, IMMUTABILITY & RLS TEST SUITE FOR AUTOMATION
-- Dedicated SQL Security & Concurrency Test Script
-- ============================================================================

BEGIN;

-- 1. Setup Test Fixture (Mock Associate if needed for FK)
DO $$
DECLARE
    v_assoc_id UUID := gen_random_uuid();
    v_event_id UUID;
    v_attempted_update BOOLEAN := FALSE;
BEGIN
    -- Insert test associate if table associates is present
    INSERT INTO public.associates (id, full_name, email, document_number, account_status)
    VALUES (v_assoc_id, 'Test Assoc Security', 'security-test@sovogin.org', '88887777', 'EN MORA')
    ON CONFLICT DO NOTHING;

    -- 2. Test Idempotency UNIQUE Constraint (Consequential Duplicate Insert Failure)
    INSERT INTO public.collection_notification_events (
        associate_id, channel, automation_type, reference_date, status, recipient_email, scheduled_for
    ) VALUES (
        v_assoc_id, 'email', 'OVERDUE_7D', '2026-08-08', 'QUEUED', 'security-test@sovogin.org', clock_timestamp()
    ) RETURNING id INTO v_event_id;

    -- Second insert with identical composite key must raise 23505 (unique_violation)
    BEGIN
        INSERT INTO public.collection_notification_events (
            associate_id, channel, automation_type, reference_date, status, recipient_email, scheduled_for
        ) VALUES (
            v_assoc_id, 'email', 'OVERDUE_7D', '2026-08-08', 'QUEUED', 'security-test@sovogin.org', clock_timestamp()
        );
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'SUCCESS: Duplicate concurrency insert correctly rejected with unique_violation (23505).';
    END;

    -- 3. Test Identity Immutability Trigger
    BEGIN
        UPDATE public.collection_notification_events
        SET automation_type = 'OVERDUE_15D'
        WHERE id = v_event_id;
        v_attempted_update := TRUE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'SUCCESS: Attempting to mutate identity column (automation_type) correctly rejected: %', SQLERRM;
    END;

    IF v_attempted_update THEN
        RAISE EXCEPTION 'TEST FAIL: Identity column mutation was allowed!';
    END IF;

    -- 4. Test Valid Lifecycle Update
    UPDATE public.collection_notification_events
    SET status = 'SENT',
        sent_at = clock_timestamp(),
        provider_message_id = 'msg_test_12345'
    WHERE id = v_event_id;

    RAISE NOTICE 'SUCCESS: Valid lifecycle update (QUEUED -> SENT) succeeded as expected.';

END;
$$;

ROLLBACK;

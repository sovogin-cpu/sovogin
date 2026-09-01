BEGIN;

-- ============================================================================
-- SOVOGIN PORTAL — PHASE 4A5.2-E4.2-F
-- Fresh Delivery Eligibility Authority RPC + Claim Token Fencing + Admin Requeue
-- ============================================================================

-- 1. Create SECURITY DEFINER Fresh Delivery Eligibility Evaluation RPC
CREATE OR REPLACE FUNCTION public.evaluate_notification_delivery_eligibility(
    p_event_id UUID,
    p_claim_token UUID
)
RETURNS TABLE (
    event_exists BOOLEAN,
    fencing_valid BOOLEAN,
    event_id UUID,
    associate_id UUID,
    channel TEXT,
    automation_type TEXT,
    reference_date DATE,
    recipient_email TEXT,
    associate_name TEXT,
    total_outstanding NUMERIC,
    days_past_due INTEGER,
    business_eligible BOOLEAN,
    ineligibility_reason TEXT,
    error_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_event RECORD;
    v_assoc RECORD;
    v_total_outstanding NUMERIC := 0;
    v_oldest_due_date DATE := NULL;
    v_days_past_due INTEGER := 0;
    v_recipient TEXT;
BEGIN
    -- 1. Authorization check: Delivery Worker capability or Admin required
    IF NOT public.can_execute_notification_delivery() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Access Denied. Delivery worker or admin authorization required.';
    END IF;

    -- 2. Claim-Token Fencing Check
    SELECT e.id, e.associate_id, e.channel, e.automation_type, e.reference_date, e.recipient_email, e.status, e.claim_token, e.claim_expires_at
    INTO v_event
    FROM public.collection_notification_events e
    WHERE e.id = p_event_id;

    IF v_event.id IS NULL THEN
        RETURN QUERY SELECT
            FALSE::BOOLEAN,
            FALSE::BOOLEAN,
            p_event_id,
            NULL::UUID,
            NULL::TEXT,
            NULL::TEXT,
            NULL::DATE,
            NULL::TEXT,
            NULL::TEXT,
            0::NUMERIC,
            0::INTEGER,
            FALSE::BOOLEAN,
            'EVENT_NOT_FOUND'::TEXT,
            'EVENT_NOT_FOUND'::TEXT;
        RETURN;
    END IF;

    IF v_event.status != 'PROCESSING' OR v_event.claim_token IS NULL OR v_event.claim_token != p_claim_token OR v_event.claim_expires_at <= clock_timestamp() THEN
        RETURN QUERY SELECT
            TRUE::BOOLEAN,
            FALSE::BOOLEAN,
            v_event.id,
            v_event.associate_id,
            v_event.channel,
            v_event.automation_type,
            v_event.reference_date,
            v_event.recipient_email,
            NULL::TEXT,
            0::NUMERIC,
            0::INTEGER,
            FALSE::BOOLEAN,
            'CLAIM_FENCING_FAILED'::TEXT,
            'CLAIM_FENCING_FAILED'::TEXT;
        RETURN;
    END IF;

    -- 3. Associate Status & Contact Info Evaluation
    SELECT a.id, a.full_name, a.email, a.status
    INTO v_assoc
    FROM public.associates a
    WHERE a.id = v_event.associate_id;

    v_recipient := COALESCE(NULLIF(TRIM(v_event.recipient_email), ''), v_assoc.email, '');

    IF v_assoc.id IS NULL OR LOWER(COALESCE(v_assoc.status, '')) NOT IN ('active', 'activo') THEN
        RETURN QUERY SELECT
            TRUE::BOOLEAN,
            TRUE::BOOLEAN,
            v_event.id,
            v_event.associate_id,
            v_event.channel,
            v_event.automation_type,
            v_event.reference_date,
            v_recipient,
            COALESCE(v_assoc.full_name, 'Asociado'),
            0::NUMERIC,
            0::INTEGER,
            FALSE::BOOLEAN,
            'SUPPRESSED_ASSOCIATE_INACTIVE'::TEXT,
            NULL::TEXT;
        RETURN;
    END IF;

    IF v_recipient = '' OR POSITION('@' IN v_recipient) = 0 THEN
        RETURN QUERY SELECT
            TRUE::BOOLEAN,
            TRUE::BOOLEAN,
            v_event.id,
            v_event.associate_id,
            v_event.channel,
            v_event.automation_type,
            v_event.reference_date,
            v_recipient,
            v_assoc.full_name,
            0::NUMERIC,
            0::INTEGER,
            FALSE::BOOLEAN,
            'SUPPRESSED_INVALID_CONTACT_EMAIL'::TEXT,
            NULL::TEXT;
        RETURN;
    END IF;

    -- 4. Canonical Financial Accounting & Net Charges Evaluation
    WITH charge_allocations AS (
        SELECT a.charge_id, COALESCE(SUM(a.amount), 0) AS total_allocated
        FROM public.membership_payment_allocations a
        JOIN public.membership_payments p ON p.id = a.payment_id
        WHERE p.associate_id = v_event.associate_id
          AND a.reversed_at IS NULL
          AND LOWER(COALESCE(p.status, 'completed')) = 'completed'
        GROUP BY a.charge_id
    ),
    charge_adjustments AS (
        SELECT adj.charge_id, COALESCE(SUM(adj.amount), 0) AS total_adjusted
        FROM public.membership_adjustments adj
        JOIN public.membership_charges c ON c.id = adj.charge_id
        WHERE c.associate_id = v_event.associate_id
          AND LOWER(COALESCE(adj.type, '')) IN ('waiver', 'discount', 'write_off')
          AND adj.id NOT IN (
              SELECT COALESCE(reverses_adjustment_id, '00000000-0000-0000-0000-000000000000'::uuid)
              FROM public.membership_adjustments
              WHERE LOWER(COALESCE(type, '')) = 'reversal'
          )
        GROUP BY adj.charge_id
    ),
    open_charges_calculated AS (
        SELECT
            c.id,
            c.due_date,
            GREATEST(0, c.original_amount - COALESCE(al.total_allocated, 0) - COALESCE(ad.total_adjusted, 0)) AS net_debt
        FROM public.membership_charges c
        LEFT JOIN charge_allocations al ON al.charge_id = c.id
        LEFT JOIN charge_adjustments ad ON ad.charge_id = c.id
        WHERE c.associate_id = v_event.associate_id
          AND LOWER(COALESCE(c.admin_status, 'open')) = 'open'
    )
    SELECT
        COALESCE(SUM(net_debt), 0),
        MIN(CASE WHEN net_debt > 0 THEN due_date ELSE NULL END)
    INTO v_total_outstanding, v_oldest_due_date
    FROM open_charges_calculated;

    IF v_total_outstanding <= 0 THEN
        RETURN QUERY SELECT
            TRUE::BOOLEAN,
            TRUE::BOOLEAN,
            v_event.id,
            v_event.associate_id,
            v_event.channel,
            v_event.automation_type,
            v_event.reference_date,
            v_recipient,
            v_assoc.full_name,
            0::NUMERIC,
            0::INTEGER,
            FALSE::BOOLEAN,
            'SUPPRESSED_ACCOUNT_AL_DIA'::TEXT,
            NULL::TEXT;
        RETURN;
    END IF;

    IF v_oldest_due_date IS NOT NULL THEN
        v_days_past_due := GREATEST(0, (CURRENT_DATE - v_oldest_due_date));
    ELSE
        v_days_past_due := 0;
    END IF;

    -- Canonical Rule for OVERDUE_7D: Must have positive outstanding debt AND days past due >= 7
    IF v_event.automation_type = 'OVERDUE_7D' AND v_days_past_due < 7 THEN
        RETURN QUERY SELECT
            TRUE::BOOLEAN,
            TRUE::BOOLEAN,
            v_event.id,
            v_event.associate_id,
            v_event.channel,
            v_event.automation_type,
            v_event.reference_date,
            v_recipient,
            v_assoc.full_name,
            v_total_outstanding,
            v_days_past_due,
            FALSE::BOOLEAN,
            'SUPPRESSED_ACCOUNT_AL_DIA'::TEXT,
            NULL::TEXT;
        RETURN;
    END IF;

    -- 5. Positively Eligible
    RETURN QUERY SELECT
        TRUE::BOOLEAN,
        TRUE::BOOLEAN,
        v_event.id,
        v_event.associate_id,
        v_event.channel,
        v_event.automation_type,
        v_event.reference_date,
        v_recipient,
        v_assoc.full_name,
        v_total_outstanding,
        v_days_past_due,
        TRUE::BOOLEAN,
        NULL::TEXT,
        NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_notification_delivery_eligibility(UUID, UUID) TO authenticated;


-- 2. Create Narrow Administrative Corrective Requeue RPC (Admin-Only with Positive Re-evaluation)
CREATE OR REPLACE FUNCTION public.requeue_suppressed_notification_event(
    p_event_id UUID
)
RETURNS TABLE (
    requeued BOOLEAN,
    event_id UUID,
    previous_status TEXT,
    new_status TEXT,
    reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
    v_event RECORD;
    v_assoc RECORD;
    v_total_outstanding NUMERIC := 0;
    v_oldest_due_date DATE := NULL;
    v_days_past_due INTEGER := 0;
    v_business_eligible BOOLEAN := TRUE;
    v_ineligibility_reason TEXT := NULL;
BEGIN
    -- Require Admin Role
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
    END IF;

    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_role IS NULL OR v_role != 'admin' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Admin authority required for corrective event requeue.';
    END IF;

    SELECT id, associate_id, channel, automation_type, reference_date, recipient_email, status, suppression_reason
    INTO v_event
    FROM public.collection_notification_events
    WHERE id = p_event_id
    FOR UPDATE;

    IF v_event.id IS NULL THEN
        RAISE EXCEPTION 'EVENT_NOT_FOUND: Event ID % does not exist.', p_event_id;
    END IF;

    IF v_event.status != 'SUPPRESSED' OR v_event.suppression_reason != 'EVENT_NOT_FOUND' THEN
        RAISE EXCEPTION 'INVALID_REQUEUE_TARGET: Only events SUPPRESSED with reason EVENT_NOT_FOUND may be requeued.';
    END IF;

    -- Positive Business Re-evaluation before requeue
    SELECT a.id, a.full_name, a.email, a.status
    INTO v_assoc
    FROM public.associates a
    WHERE a.id = v_event.associate_id;

    IF v_assoc.id IS NULL OR LOWER(COALESCE(v_assoc.status, '')) NOT IN ('active', 'activo') THEN
        v_business_eligible := FALSE;
        v_ineligibility_reason := 'SUPPRESSED_ASSOCIATE_INACTIVE';
    END IF;

    IF v_business_eligible THEN
        WITH charge_allocations AS (
            SELECT a.charge_id, COALESCE(SUM(a.amount), 0) AS total_allocated
            FROM public.membership_payment_allocations a
            JOIN public.membership_payments p ON p.id = a.payment_id
            WHERE p.associate_id = v_event.associate_id
              AND a.reversed_at IS NULL
              AND LOWER(COALESCE(p.status, 'completed')) = 'completed'
            GROUP BY a.charge_id
        ),
        charge_adjustments AS (
            SELECT adj.charge_id, COALESCE(SUM(adj.amount), 0) AS total_adjusted
            FROM public.membership_adjustments adj
            JOIN public.membership_charges c ON c.id = adj.charge_id
            WHERE c.associate_id = v_event.associate_id
              AND LOWER(COALESCE(adj.type, '')) IN ('waiver', 'discount', 'write_off')
              AND adj.id NOT IN (
                  SELECT COALESCE(reverses_adjustment_id, '00000000-0000-0000-0000-000000000000'::uuid)
                  FROM public.membership_adjustments
                  WHERE LOWER(COALESCE(type, '')) = 'reversal'
              )
            GROUP BY adj.charge_id
        ),
        open_charges_calculated AS (
            SELECT
                c.id,
                c.due_date,
                GREATEST(0, c.original_amount - COALESCE(al.total_allocated, 0) - COALESCE(ad.total_adjusted, 0)) AS net_debt
            FROM public.membership_charges c
            LEFT JOIN charge_allocations al ON al.charge_id = c.id
            LEFT JOIN charge_adjustments ad ON ad.charge_id = c.id
            WHERE c.associate_id = v_event.associate_id
              AND LOWER(COALESCE(c.admin_status, 'open')) = 'open'
        )
        SELECT
            COALESCE(SUM(net_debt), 0),
            MIN(CASE WHEN net_debt > 0 THEN due_date ELSE NULL END)
        INTO v_total_outstanding, v_oldest_due_date
        FROM open_charges_calculated;

        IF v_total_outstanding <= 0 THEN
            v_business_eligible := FALSE;
            v_ineligibility_reason := 'SUPPRESSED_ACCOUNT_AL_DIA';
        END IF;
    END IF;

    IF NOT v_business_eligible THEN
        RETURN QUERY SELECT
            FALSE::BOOLEAN,
            p_event_id,
            'SUPPRESSED'::TEXT,
            'SUPPRESSED'::TEXT,
            v_ineligibility_reason;
        RETURN;
    END IF;

    UPDATE public.collection_notification_events
    SET status = 'QUEUED',
        suppression_reason = NULL,
        claim_token = NULL,
        claimed_at = NULL,
        claim_expires_at = NULL,
        attempt_count = 0,
        updated_at = clock_timestamp()
    WHERE id = p_event_id;

    RETURN QUERY SELECT
        TRUE::BOOLEAN,
        p_event_id,
        'SUPPRESSED'::TEXT,
        'QUEUED'::TEXT,
        NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.requeue_suppressed_notification_event(UUID) TO authenticated;

COMMIT;

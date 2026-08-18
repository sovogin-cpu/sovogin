-- Migration: 20260822_portal_phase4a2_financial_mutations.sql
-- Description: RPCs atómicas para mutaciones financieras de membresías (Cargos, Pagos, Ajustes y Reversiones) - Fase 4A2 Parte 2B

-- 1. RPC: public.create_membership_charge
CREATE OR REPLACE FUNCTION public.create_membership_charge(
    p_associate_id UUID,
    p_concept TEXT,
    p_original_amount NUMERIC,
    p_due_date DATE,
    p_currency VARCHAR DEFAULT 'COP',
    p_membership_id UUID DEFAULT NULL,
    p_period_start DATE DEFAULT NULL,
    p_period_end DATE DEFAULT NULL,
    p_billing_cycle_key VARCHAR DEFAULT NULL,
    p_source VARCHAR DEFAULT 'manual_admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_is_admin BOOLEAN := false;
    v_associate RECORD;
    v_membership_id UUID := p_membership_id;
    v_charge_id UUID;
    v_clean_concept TEXT;
    v_clean_currency VARCHAR;
    v_clean_source VARCHAR;
    v_credit_res JSONB;
BEGIN
    v_caller_id := auth.uid();
    v_clean_concept := trim(p_concept);
    v_clean_currency := upper(trim(p_currency));
    v_clean_source := coalesce(trim(p_source), 'manual_admin');

    -- Autorización estricta
    IF auth.role() = 'service_role' THEN
        -- Permitido
    ELSIF auth.role() = 'authenticated' AND v_caller_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE id = v_caller_id AND role = 'admin'
        ) INTO v_is_admin;

        IF NOT v_is_admin THEN
            RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios administrativos para crear cargos.';
        END IF;
    ELSE
        RAISE EXCEPTION 'Acceso denegado. Contexto de ejecución no autorizado.';
    END IF;

    -- Validaciones de entrada
    IF p_associate_id IS NULL THEN
        RAISE EXCEPTION 'El id del asociado es obligatorio.';
    END IF;

    IF v_clean_concept IS NULL OR length(v_clean_concept) = 0 THEN
        RAISE EXCEPTION 'El concepto del cargo es obligatorio.';
    END IF;

    IF p_original_amount IS NULL OR p_original_amount <= 0 THEN
        RAISE EXCEPTION 'El monto original del cargo debe ser mayor a cero.';
    END IF;

    IF p_due_date IS NULL THEN
        RAISE EXCEPTION 'La fecha de vencimiento es obligatoria.';
    END IF;

    IF v_clean_currency IS NULL OR char_length(v_clean_currency) != 3 THEN
        RAISE EXCEPTION 'La moneda debe ser un código ISO de 3 caracteres (ej. COP).';
    END IF;

    IF v_clean_source NOT IN ('system', 'manual_admin', 'opening_balance') THEN
        RAISE EXCEPTION 'Origen del cargo inválido (%s).', v_clean_source;
    END IF;

    -- Bloquear asociado FOR UPDATE
    SELECT * INTO v_associate FROM public.associates WHERE id = p_associate_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El asociado especificado no existe.';
    END IF;

    -- Validar o resolver membership_id garantizando pertenencia al p_associate_id
    IF v_membership_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.associate_memberships
            WHERE id = v_membership_id AND associate_id = p_associate_id
        ) THEN
            RAISE EXCEPTION 'La membresía especificada no pertenece al asociado.';
        END IF;
    ELSE
        SELECT id INTO v_membership_id
        FROM public.associate_memberships
        WHERE associate_id = p_associate_id;
    END IF;

    -- Insertar cargo en membership_charges
    INSERT INTO public.membership_charges (
        associate_id,
        membership_id,
        concept,
        original_amount,
        currency,
        due_date,
        period_start,
        period_end,
        billing_cycle_key,
        admin_status,
        source,
        created_at,
        updated_at
    ) VALUES (
        p_associate_id,
        v_membership_id,
        v_clean_concept,
        p_original_amount,
        v_clean_currency,
        p_due_date,
        p_period_start,
        p_period_end,
        p_billing_cycle_key,
        'open',
        v_clean_source,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_charge_id;

    -- Aplicar atómicamente crédito a favor no asignado previo dentro de la misma transacción
    v_credit_res := public.allocate_unallocated_credit(p_associate_id);

    RETURN jsonb_build_object(
        'success', true,
        'charge_id', v_charge_id,
        'associate_id', p_associate_id,
        'original_amount', p_original_amount,
        'credit_allocations_created', coalesce((v_credit_res->>'total_allocations_created')::INT, 0)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_membership_charge(UUID, TEXT, NUMERIC, DATE, VARCHAR, UUID, DATE, DATE, VARCHAR, VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_membership_charge(UUID, TEXT, NUMERIC, DATE, VARCHAR, UUID, DATE, DATE, VARCHAR, VARCHAR) TO service_role, authenticated;


-- 2. RPC: public.register_membership_payment
CREATE OR REPLACE FUNCTION public.register_membership_payment(
    p_associate_id UUID,
    p_amount NUMERIC,
    p_payment_method VARCHAR,
    p_paid_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    p_currency VARCHAR DEFAULT 'COP',
    p_notes TEXT DEFAULT NULL,
    p_membership_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_is_admin BOOLEAN := false;
    v_associate RECORD;
    v_membership_id UUID := p_membership_id;
    v_payment_id UUID;
    v_clean_currency VARCHAR;
    v_clean_method VARCHAR;
    v_proc_res JSONB;
BEGIN
    v_caller_id := auth.uid();
    v_clean_currency := upper(trim(p_currency));
    v_clean_method := trim(p_payment_method);

    -- Autorización estricta
    IF auth.role() = 'service_role' THEN
        -- Permitido
    ELSIF auth.role() = 'authenticated' AND v_caller_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE id = v_caller_id AND role = 'admin'
        ) INTO v_is_admin;

        IF NOT v_is_admin THEN
            RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios administrativos para registrar pagos.';
        END IF;
    ELSE
        RAISE EXCEPTION 'Acceso denegado. Contexto de ejecución no autorizado.';
    END IF;

    -- Validaciones de entrada
    IF p_associate_id IS NULL THEN
        RAISE EXCEPTION 'El id del asociado es obligatorio.';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'El monto del pago debe ser mayor a cero.';
    END IF;

    IF v_clean_method IS NULL OR length(v_clean_method) = 0 THEN
        RAISE EXCEPTION 'El método de pago es obligatorio.';
    END IF;

    IF v_clean_currency IS NULL OR char_length(v_clean_currency) != 3 THEN
        RAISE EXCEPTION 'La moneda debe ser un código ISO de 3 caracteres (ej. COP).';
    END IF;

    -- Bloquear asociado FOR UPDATE
    SELECT * INTO v_associate FROM public.associates WHERE id = p_associate_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El asociado especificado no existe.';
    END IF;

    -- Validar o resolver membership_id garantizando pertenencia al p_associate_id
    IF v_membership_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.associate_memberships
            WHERE id = v_membership_id AND associate_id = p_associate_id
        ) THEN
            RAISE EXCEPTION 'La membresía especificada no pertenece al asociado.';
        END IF;
    ELSE
        SELECT id INTO v_membership_id
        FROM public.associate_memberships
        WHERE associate_id = p_associate_id;
    END IF;

    -- Insertar pago en membership_payments
    INSERT INTO public.membership_payments (
        associate_id,
        membership_id,
        amount,
        currency,
        payment_order_id,
        payment_method,
        status,
        paid_at,
        notes,
        created_by,
        created_at
    ) VALUES (
        p_associate_id,
        v_membership_id,
        p_amount,
        v_clean_currency,
        NULL,
        v_clean_method,
        'completed',
        coalesce(p_paid_at, timezone('utc'::text, now())),
        trim(p_notes),
        v_caller_id,
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_payment_id;

    -- Procesar asignaciones FIFO atómicamente dentro de la misma transacción
    v_proc_res := public.process_membership_payment(v_payment_id);

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'amount', p_amount,
        'allocations_created', (v_proc_res->>'allocations_created')::INT,
        'unallocated_credit', (v_proc_res->>'unallocated_credit')::NUMERIC
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_membership_payment(UUID, NUMERIC, VARCHAR, TIMESTAMPTZ, VARCHAR, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_membership_payment(UUID, NUMERIC, VARCHAR, TIMESTAMPTZ, VARCHAR, TEXT, UUID) TO service_role, authenticated;


-- 3. RPC: public.create_membership_adjustment
CREATE OR REPLACE FUNCTION public.create_membership_adjustment(
    p_charge_id UUID,
    p_type VARCHAR,
    p_amount NUMERIC,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_is_admin BOOLEAN := false;
    v_charge RECORD;
    v_adj_id UUID;
    v_clean_type VARCHAR;
    v_clean_reason TEXT;
    v_active_allocations NUMERIC(14,2);
    v_active_adjustments NUMERIC(14,2);
    v_net_charge_debt NUMERIC(14,2);
BEGIN
    v_caller_id := auth.uid();
    v_clean_type := lower(trim(p_type));
    v_clean_reason := trim(p_reason);

    -- Autorización estricta
    IF auth.role() = 'service_role' THEN
        -- Permitido
    ELSIF auth.role() = 'authenticated' AND v_caller_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE id = v_caller_id AND role = 'admin'
        ) INTO v_is_admin;

        IF NOT v_is_admin THEN
            RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios administrativos para aplicar ajustes.';
        END IF;
    ELSE
        RAISE EXCEPTION 'Acceso denegado. Contexto de ejecución no autorizado.';
    END IF;

    -- Validaciones de entrada
    IF p_charge_id IS NULL THEN
        RAISE EXCEPTION 'El id del cargo es obligatorio.';
    END IF;

    IF v_clean_type NOT IN ('waiver', 'discount', 'write_off') THEN
        RAISE EXCEPTION 'Tipo de ajuste inválido (%s). Solo se permiten waiver, discount o write_off.', v_clean_type;
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'El monto del ajuste debe ser mayor a cero.';
    END IF;

    IF v_clean_reason IS NULL OR length(v_clean_reason) < 3 THEN
        RAISE EXCEPTION 'El motivo del ajuste es obligatorio y debe tener al menos 3 caracteres.';
    END IF;

    -- Bloquear cargo FOR UPDATE
    SELECT * INTO v_charge FROM public.membership_charges WHERE id = p_charge_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El cargo especificado no existe.';
    END IF;

    IF v_charge.admin_status != 'open' THEN
        RAISE EXCEPTION 'Solo se pueden aplicar ajustes a cargos en estado open.';
    END IF;

    -- Calcular deuda neta disponible para ajuste
    SELECT COALESCE(SUM(pa.amount), 0) INTO v_active_allocations
    FROM public.membership_payment_allocations pa
    JOIN public.membership_payments p ON p.id = pa.payment_id
    WHERE pa.charge_id = p_charge_id
      AND pa.reversed_at IS NULL
      AND p.status = 'completed';

    SELECT
        COALESCE(SUM(CASE WHEN ma.type IN ('waiver', 'discount', 'write_off') THEN ma.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN ma.type = 'reversal' THEN ma.amount ELSE 0 END), 0)
    INTO v_active_adjustments
    FROM public.membership_adjustments ma
    WHERE ma.charge_id = p_charge_id;

    v_net_charge_debt := GREATEST(0, v_charge.original_amount - v_active_allocations - v_active_adjustments);

    IF p_amount > v_net_charge_debt THEN
        RAISE EXCEPTION 'El monto del ajuste (%s) excede la deuda neta disponible del cargo (%s).', p_amount, v_net_charge_debt;
    END IF;

    -- Insertar ajuste en membership_adjustments
    INSERT INTO public.membership_adjustments (
        associate_id,
        charge_id,
        type,
        amount,
        reverses_adjustment_id,
        reason,
        created_by,
        created_at
    ) VALUES (
        v_charge.associate_id,
        p_charge_id,
        v_clean_type,
        p_amount,
        NULL,
        v_clean_reason,
        v_caller_id,
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_adj_id;

    RETURN jsonb_build_object(
        'success', true,
        'adjustment_id', v_adj_id,
        'charge_id', p_charge_id,
        'amount', p_amount,
        'type', v_clean_type,
        'remaining_debt_after', (v_net_charge_debt - p_amount)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_membership_adjustment(UUID, VARCHAR, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_membership_adjustment(UUID, VARCHAR, NUMERIC, TEXT) TO service_role, authenticated;


-- 4. RPC: public.reverse_membership_adjustment
CREATE OR REPLACE FUNCTION public.reverse_membership_adjustment(
    p_adjustment_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_is_admin BOOLEAN := false;
    v_orig RECORD;
    v_rev_id UUID;
    v_clean_reason TEXT;
BEGIN
    v_caller_id := auth.uid();
    v_clean_reason := trim(p_reason);

    -- Autorización estricta
    IF auth.role() = 'service_role' THEN
        -- Permitido
    ELSIF auth.role() = 'authenticated' AND v_caller_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE id = v_caller_id AND role = 'admin'
        ) INTO v_is_admin;

        IF NOT v_is_admin THEN
            RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios administrativos para revertir ajustes.';
        END IF;
    ELSE
        RAISE EXCEPTION 'Acceso denegado. Contexto de ejecución no autorizado.';
    END IF;

    -- Validaciones de entrada
    IF p_adjustment_id IS NULL THEN
        RAISE EXCEPTION 'El id del ajuste original es obligatorio.';
    END IF;

    IF v_clean_reason IS NULL OR length(v_clean_reason) < 3 THEN
        RAISE EXCEPTION 'El motivo de la reversión es obligatorio y debe tener al menos 3 caracteres.';
    END IF;

    -- Bloquear el ajuste original FOR UPDATE
    SELECT * INTO v_orig FROM public.membership_adjustments WHERE id = p_adjustment_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El ajuste especificado no fue encontrado.';
    END IF;

    IF v_orig.type = 'reversal' THEN
        RAISE EXCEPTION 'No se puede revertir un ajuste de tipo reversal.';
    END IF;

    -- Verificar que no exista ya una reversión para este ajuste original
    IF EXISTS (
        SELECT 1 FROM public.membership_adjustments WHERE reverses_adjustment_id = p_adjustment_id
    ) THEN
        RAISE EXCEPTION 'Este ajuste ya ha sido revertido anteriormente.';
    END IF;

    -- Insertar fila de reversión
    INSERT INTO public.membership_adjustments (
        associate_id,
        charge_id,
        type,
        amount,
        reverses_adjustment_id,
        reason,
        created_by,
        created_at
    ) VALUES (
        v_orig.associate_id,
        v_orig.charge_id,
        'reversal',
        v_orig.amount,
        p_adjustment_id,
        v_clean_reason,
        v_caller_id,
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_rev_id;

    RETURN jsonb_build_object(
        'success', true,
        'reversal_id', v_rev_id,
        'reverses_adjustment_id', p_adjustment_id,
        'amount', v_orig.amount
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reverse_membership_adjustment(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_membership_adjustment(UUID, TEXT) TO service_role, authenticated;

-- Migration: 20260820_portal_phase4a1_membership_billing_core.sql
-- Description: Implementación endurecida del Core DB y Motor Financiero de Membresías (Fase 4A1)
-- IMPORTANT: Modelo puramente aditivo con comprobaciones de integridad contable e inmutabilidad en triggers DB.

-- 1. TABLA: public.membership_categories (Catálogo Configurable de Categorías)
CREATE TABLE IF NOT EXISTS public.membership_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABLA: public.membership_plans (Planes de Membresía y Frecuencias de Cobro)
CREATE TABLE IF NOT EXISTS public.membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    currency VARCHAR(3) DEFAULT 'COP' NOT NULL CHECK (char_length(currency) = 3),
    standard_amount NUMERIC(14,2) DEFAULT 0 NOT NULL CHECK (standard_amount >= 0),
    billing_mode VARCHAR(20) DEFAULT 'recurring' NOT NULL CHECK (billing_mode IN ('recurring', 'manual', 'free')),
    billing_interval_unit VARCHAR(10) NULL CHECK (billing_interval_unit IN ('day', 'week', 'month', 'year')),
    billing_interval_count INTEGER NULL CHECK (billing_interval_count > 0),
    billing_anchor_mode VARCHAR(20) DEFAULT 'anniversary' NOT NULL CHECK (billing_anchor_mode IN ('anniversary', 'fixed', 'manual')),
    fixed_anchor_month INTEGER NULL CHECK (fixed_anchor_month BETWEEN 1 AND 12),
    fixed_anchor_day INTEGER NULL CHECK (fixed_anchor_day BETWEEN 1 AND 31),
    allow_partial_payments BOOLEAN DEFAULT true NOT NULL,
    allow_overpayments BOOLEAN DEFAULT true NOT NULL,
    allow_custom_amount BOOLEAN DEFAULT true NOT NULL,
    minimum_payment_amount NUMERIC(14,2) DEFAULT 0 NOT NULL CHECK (minimum_payment_amount >= 0),
    grace_period_days INTEGER DEFAULT 10 NOT NULL CHECK (grace_period_days >= 0),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_membership_plans_billing_mode CHECK (
        (billing_mode = 'recurring' AND standard_amount > 0 AND billing_interval_unit IS NOT NULL AND billing_interval_count >= 1)
        OR (billing_mode = 'manual' AND billing_interval_unit IS NULL AND billing_interval_count IS NULL)
        OR (billing_mode = 'free' AND standard_amount = 0 AND billing_interval_unit IS NULL AND billing_interval_count IS NULL)
    ),
    CONSTRAINT chk_membership_plans_anchor CHECK (
        (billing_anchor_mode = 'fixed' AND fixed_anchor_day IS NOT NULL)
        OR (billing_anchor_mode IN ('anniversary', 'manual') AND fixed_anchor_day IS NULL AND fixed_anchor_month IS NULL)
    )
);

-- 3. TABLA: public.associate_memberships (Cuenta de Membresía 1:1 por Asociado)
CREATE TABLE IF NOT EXISTS public.associate_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    associate_id UUID NOT NULL UNIQUE REFERENCES public.associates(id) ON DELETE CASCADE,
    membership_plan_id UUID NULL REFERENCES public.membership_plans(id) ON DELETE SET NULL,
    category_id UUID NULL REFERENCES public.membership_categories(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    billing_anchor_date DATE DEFAULT CURRENT_DATE NOT NULL,
    billing_status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (billing_status IN ('active', 'paused', 'terminated')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABLA: public.membership_plan_changes (Historial Auditable de Cambios de Plan)
CREATE TABLE IF NOT EXISTS public.membership_plan_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    associate_id UUID NOT NULL REFERENCES public.associates(id) ON DELETE CASCADE,
    old_plan_id UUID NULL REFERENCES public.membership_plans(id) ON DELETE SET NULL,
    new_plan_id UUID NOT NULL REFERENCES public.membership_plans(id) ON DELETE RESTRICT,
    reason TEXT NULL,
    changed_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABLA: public.membership_charges (Cargos Emitidos / Deudas)
CREATE TABLE IF NOT EXISTS public.membership_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    associate_id UUID NOT NULL REFERENCES public.associates(id) ON DELETE CASCADE,
    membership_id UUID NULL REFERENCES public.associate_memberships(id) ON DELETE SET NULL,
    concept VARCHAR(255) NOT NULL,
    original_amount NUMERIC(14,2) NOT NULL CHECK (original_amount > 0),
    currency VARCHAR(3) DEFAULT 'COP' NOT NULL CHECK (char_length(currency) = 3),
    due_date DATE NOT NULL,
    period_start DATE NULL,
    period_end DATE NULL,
    billing_cycle_key VARCHAR(120) NULL UNIQUE,
    admin_status VARCHAR(20) DEFAULT 'open' NOT NULL CHECK (admin_status IN ('open', 'cancelled')),
    source VARCHAR(30) DEFAULT 'system' NOT NULL CHECK (source IN ('system', 'manual_admin', 'opening_balance')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABLA: public.membership_payments (Pagos Recibidos de Asociados)
CREATE TABLE IF NOT EXISTS public.membership_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    associate_id UUID NOT NULL REFERENCES public.associates(id) ON DELETE CASCADE,
    membership_id UUID NULL REFERENCES public.associate_memberships(id) ON DELETE SET NULL,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'COP' NOT NULL CHECK (char_length(currency) = 3),
    payment_order_id UUID NULL UNIQUE REFERENCES public.payment_orders(id) ON DELETE SET NULL,
    payment_method VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed' NOT NULL CHECK (status IN ('completed', 'refunded', 'cancelled')),
    paid_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    notes TEXT NULL,
    created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABLA: public.membership_payment_allocations (Matriz Auditable de Asignación Pago -> Cargo)
CREATE TABLE IF NOT EXISTS public.membership_payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.membership_payments(id) ON DELETE CASCADE,
    charge_id UUID NOT NULL REFERENCES public.membership_charges(id) ON DELETE CASCADE,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    reversed_at TIMESTAMPTZ NULL,
    reversed_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    reversal_reason TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. TABLA: public.membership_adjustments (Condonaciones, Descuentos y Reversiones de Ajustes)
CREATE TABLE IF NOT EXISTS public.membership_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    associate_id UUID NOT NULL REFERENCES public.associates(id) ON DELETE CASCADE,
    charge_id UUID NULL REFERENCES public.membership_charges(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('waiver', 'discount', 'write_off', 'reversal')),
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    reverses_adjustment_id UUID NULL REFERENCES public.membership_adjustments(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_membership_adjustments_reversal CHECK (
        (type = 'reversal' AND reverses_adjustment_id IS NOT NULL)
        OR (type != 'reversal' AND reverses_adjustment_id IS NULL)
    )
);

-- 9. ÍNDICES DE RENDIMIENTO Y UNICIDAD EN REVERSIONES DE AJUSTE
CREATE INDEX IF NOT EXISTS idx_assoc_mb_associate ON public.associate_memberships (associate_id);
CREATE INDEX IF NOT EXISTS idx_mb_charges_fifo ON public.membership_charges (associate_id, due_date, created_at) WHERE admin_status = 'open';
CREATE INDEX IF NOT EXISTS idx_mb_payments_assoc ON public.membership_payments (associate_id, status, paid_at);
CREATE INDEX IF NOT EXISTS idx_mb_allocations_payment ON public.membership_payment_allocations (payment_id);
CREATE INDEX IF NOT EXISTS idx_mb_allocations_charge ON public.membership_payment_allocations (charge_id) WHERE reversed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mb_adjustments_charge ON public.membership_adjustments (charge_id);

-- Unicidad estricta: una reversión total por ajuste original
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_adjustment_reversal 
ON public.membership_adjustments (reverses_adjustment_id) 
WHERE type = 'reversal';

-- 10. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.membership_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.associate_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plan_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_adjustments ENABLE ROW LEVEL SECURITY;

-- 11. POLÍTICAS RLS SEGURAS E IDEMPOTENTES
DROP POLICY IF EXISTS "Lectura de categorias de membresia" ON public.membership_categories;
CREATE POLICY "Lectura de categorias de membresia" ON public.membership_categories FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Admin gestiona categorias de membresia" ON public.membership_categories;
CREATE POLICY "Admin gestiona categorias de membresia" ON public.membership_categories FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Lectura de planes de membresia" ON public.membership_plans;
CREATE POLICY "Lectura de planes de membresia" ON public.membership_plans FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Admin gestiona planes de membresia" ON public.membership_plans;
CREATE POLICY "Admin gestiona planes de membresia" ON public.membership_plans FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Asociado ve su propia cuenta de membresia" ON public.associate_memberships;
CREATE POLICY "Asociado ve su propia cuenta de membresia" ON public.associate_memberships FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.associates a WHERE a.id = associate_memberships.associate_id AND a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admin gestiona cuentas de membresia" ON public.associate_memberships;
CREATE POLICY "Admin gestiona cuentas de membresia" ON public.associate_memberships FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Asociado ve historial de planes propios" ON public.membership_plan_changes;
CREATE POLICY "Asociado ve historial de planes propios" ON public.membership_plan_changes FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.associates a WHERE a.id = membership_plan_changes.associate_id AND a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admin gestiona historial de planes" ON public.membership_plan_changes;
CREATE POLICY "Admin gestiona historial de planes" ON public.membership_plan_changes FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Asociado ve sus propios cargos" ON public.membership_charges;
CREATE POLICY "Asociado ve sus propios cargos" ON public.membership_charges FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.associates a WHERE a.id = membership_charges.associate_id AND a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admin gestiona cargos de membresia" ON public.membership_charges;
CREATE POLICY "Admin gestiona cargos de membresia" ON public.membership_charges FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Asociado ve sus propios pagos" ON public.membership_payments;
CREATE POLICY "Asociado ve sus propios pagos" ON public.membership_payments FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.associates a WHERE a.id = membership_payments.associate_id AND a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admin gestiona pagos de membresia" ON public.membership_payments;
CREATE POLICY "Admin gestiona pagos de membresia" ON public.membership_payments FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Asociado ve sus propias asignaciones de pago" ON public.membership_payment_allocations;
CREATE POLICY "Asociado ve sus propias asignaciones de pago" ON public.membership_payment_allocations FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.membership_payments p
            JOIN public.associates a ON a.id = p.associate_id
            WHERE p.id = membership_payment_allocations.payment_id
              AND a.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admin gestiona asignaciones de pago" ON public.membership_payment_allocations;
CREATE POLICY "Admin gestiona asignaciones de pago" ON public.membership_payment_allocations FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Asociado ve sus propios ajustes" ON public.membership_adjustments;
CREATE POLICY "Asociado ve sus propios ajustes" ON public.membership_adjustments FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.associates a WHERE a.id = membership_adjustments.associate_id AND a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admin gestiona ajustes de membresia" ON public.membership_adjustments;
CREATE POLICY "Admin gestiona ajustes de membresia" ON public.membership_adjustments FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 12. TRIGGERS DE INTEGRIDAD Y RESTRICCIONES CONTABLES EN BASE DE DATOS

-- A. Trigger function: Validar Inmutabilidad Financiera destructiva
CREATE OR REPLACE FUNCTION public.fn_protect_financial_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_TABLE_NAME = 'membership_charges' THEN
        IF OLD.original_amount != NEW.original_amount OR OLD.currency != NEW.currency OR OLD.associate_id != NEW.associate_id THEN
            RAISE EXCEPTION 'No se permite modificar destructivamente el monto original, moneda ni asociado de un cargo.';
        END IF;
    ELSIF TG_TABLE_NAME = 'membership_payments' THEN
        IF OLD.amount != NEW.amount OR OLD.currency != NEW.currency OR OLD.associate_id != NEW.associate_id THEN
            RAISE EXCEPTION 'No se permite modificar destructivamente el monto, moneda ni asociado de un pago registrado.';
        END IF;
    ELSIF TG_TABLE_NAME = 'membership_payment_allocations' THEN
        IF OLD.amount != NEW.amount OR OLD.payment_id != NEW.payment_id OR OLD.charge_id != NEW.charge_id THEN
            RAISE EXCEPTION 'No se permite modificar la asignacion original. Debe revertirse de forma auditable.';
        END IF;
    ELSIF TG_TABLE_NAME = 'membership_adjustments' THEN
        IF OLD.amount != NEW.amount OR OLD.type != NEW.type OR OLD.charge_id IS DISTINCT FROM NEW.charge_id THEN
            RAISE EXCEPTION 'No se permite modificar destructivamente un ajuste contable registrado. Debe emitirse una reversión.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_immutability_charges ON public.membership_charges;
CREATE TRIGGER trg_immutability_charges BEFORE UPDATE ON public.membership_charges
    FOR EACH ROW EXECUTE FUNCTION public.fn_protect_financial_immutability();

DROP TRIGGER IF EXISTS trg_immutability_payments ON public.membership_payments;
CREATE TRIGGER trg_immutability_payments BEFORE UPDATE ON public.membership_payments
    FOR EACH ROW EXECUTE FUNCTION public.fn_protect_financial_immutability();

DROP TRIGGER IF EXISTS trg_immutability_allocations ON public.membership_payment_allocations;
CREATE TRIGGER trg_immutability_allocations BEFORE UPDATE ON public.membership_payment_allocations
    FOR EACH ROW EXECUTE FUNCTION public.fn_protect_financial_immutability();

DROP TRIGGER IF EXISTS trg_immutability_adjustments ON public.membership_adjustments;
CREATE TRIGGER trg_immutability_adjustments BEFORE UPDATE ON public.membership_adjustments
    FOR EACH ROW EXECUTE FUNCTION public.fn_protect_financial_immutability();

-- B. Trigger function: Impedir cancelación de cargos con asignaciones activas
CREATE OR REPLACE FUNCTION public.fn_prevent_cancelled_charge_with_allocations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.admin_status = 'open' AND NEW.admin_status = 'cancelled' THEN
        IF EXISTS (
            SELECT 1 FROM public.membership_payment_allocations
            WHERE charge_id = NEW.id AND reversed_at IS NULL
        ) THEN
            RAISE EXCEPTION 'No se puede cancelar un cargo que posee asignaciones de pago activas. Revierta los pagos antes de cancelar.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_cancelled_charge ON public.membership_charges;
CREATE TRIGGER trg_prevent_cancelled_charge BEFORE UPDATE ON public.membership_charges
    FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_cancelled_charge_with_allocations();

-- C. Trigger function: Validar consistencia y limites en Insert de Allocations
CREATE OR REPLACE FUNCTION public.fn_validate_payment_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_payment RECORD;
    v_charge RECORD;
    v_payment_allocated NUMERIC(14,2);
    v_charge_allocated NUMERIC(14,2);
    v_charge_adjustments NUMERIC(14,2);
BEGIN
    SELECT * INTO v_payment FROM public.membership_payments WHERE id = NEW.payment_id;
    SELECT * INTO v_charge FROM public.membership_charges WHERE id = NEW.charge_id;

    IF v_payment.associate_id != v_charge.associate_id THEN
        RAISE EXCEPTION 'El pago y el cargo pertenecen a asociados diferentes.';
    END IF;

    IF v_payment.currency != v_charge.currency THEN
        RAISE EXCEPTION 'La moneda del pago (%s) no coincide con la del cargo (%s).', v_payment.currency, v_charge.currency;
    END IF;

    IF v_payment.status != 'completed' THEN
        RAISE EXCEPTION 'No se pueden asignar pagos que no esten en estado completed.';
    END IF;

    -- Validar que la asignación no supere el monto disponible del pago
    SELECT COALESCE(SUM(amount), 0) INTO v_payment_allocated
    FROM public.membership_payment_allocations
    WHERE payment_id = NEW.payment_id AND reversed_at IS NULL;

    IF (v_payment_allocated + NEW.amount) > v_payment.amount THEN
        RAISE EXCEPTION 'La asignacion excede el monto total disponible del pago.';
    END IF;

    -- Validar que la asignación + ajustes no supere la deuda original del cargo
    SELECT COALESCE(SUM(amount), 0) INTO v_charge_allocated
    FROM public.membership_payment_allocations
    WHERE charge_id = NEW.charge_id AND reversed_at IS NULL;

    SELECT 
        COALESCE(SUM(CASE WHEN type IN ('waiver', 'discount', 'write_off') THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'reversal' THEN amount ELSE 0 END), 0)
    INTO v_charge_adjustments
    FROM public.membership_adjustments
    WHERE charge_id = NEW.charge_id;

    IF (v_charge_allocated + v_charge_adjustments + NEW.amount) > v_charge.original_amount THEN
        RAISE EXCEPTION 'La asignacion mas los ajustes excede el monto original del cargo.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_allocation ON public.membership_payment_allocations;
CREATE TRIGGER trg_validate_allocation BEFORE INSERT ON public.membership_payment_allocations
    FOR EACH ROW EXECUTE FUNCTION public.fn_validate_payment_allocation();

-- D. Trigger function: Validar consistencia y limites en Insert de Adjustments
CREATE OR REPLACE FUNCTION public.fn_validate_membership_adjustment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_orig RECORD;
    v_charge RECORD;
    v_charge_allocated NUMERIC(14,2);
    v_charge_adjustments NUMERIC(14,2);
BEGIN
    IF NEW.type = 'reversal' THEN
        IF NEW.reverses_adjustment_id IS NULL THEN
            RAISE EXCEPTION 'Un ajuste de tipo reversal requiere el ID del ajuste original.';
        END IF;

        SELECT * INTO v_orig FROM public.membership_adjustments WHERE id = NEW.reverses_adjustment_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Ajuste original a revertir no encontrado.';
        END IF;

        IF v_orig.type = 'reversal' THEN
            RAISE EXCEPTION 'No se puede revertir una reversión.';
        END IF;

        IF v_orig.associate_id != NEW.associate_id OR v_orig.charge_id IS DISTINCT FROM NEW.charge_id THEN
            RAISE EXCEPTION 'El ajuste de reversión debe pertenecer al mismo asociado y cargo que el original.';
        END IF;

        IF NEW.amount != v_orig.amount THEN
            RAISE EXCEPTION 'La reversión en MVP debe ser exactamente igual al monto del ajuste original (monto original: %).', v_orig.amount;
        END IF;
    ELSE
        IF NEW.reverses_adjustment_id IS NOT NULL THEN
            RAISE EXCEPTION 'Solo los ajustes de tipo reversal pueden tener reverses_adjustment_id.';
        END IF;

        -- Para waiver/discount/write_off vinculados a un cargo, verificar que no supere la deuda original
        IF NEW.charge_id IS NOT NULL THEN
            SELECT * INTO v_charge FROM public.membership_charges WHERE id = NEW.charge_id;

            SELECT COALESCE(SUM(amount), 0) INTO v_charge_allocated
            FROM public.membership_payment_allocations
            WHERE charge_id = NEW.charge_id AND reversed_at IS NULL;

            SELECT 
                COALESCE(SUM(CASE WHEN type IN ('waiver', 'discount', 'write_off') THEN amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN type = 'reversal' THEN amount ELSE 0 END), 0)
            INTO v_charge_adjustments
            FROM public.membership_adjustments
            WHERE charge_id = NEW.charge_id;

            IF (v_charge_allocated + v_charge_adjustments + NEW.amount) > v_charge.original_amount THEN
                RAISE EXCEPTION 'El ajuste mas las asignaciones excede el monto original del cargo.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_adjustment ON public.membership_adjustments;
CREATE TRIGGER trg_validate_adjustment BEFORE INSERT ON public.membership_adjustments
    FOR EACH ROW EXECUTE FUNCTION public.fn_validate_membership_adjustment();


-- 13. FUNCIONES RPC TRANSACCIONALES ENDURECIDAS CON SECURITY DEFINER Y AUTORIZACIÓN EXPLICITA

-- A. RPC: process_membership_payment (Asignación FIFO Atómica)
CREATE OR REPLACE FUNCTION public.process_membership_payment(p_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_is_admin BOOLEAN := false;
    v_payment RECORD;
    v_charge RECORD;
    v_unallocated_amount NUMERIC(14,2);
    v_active_allocations NUMERIC(14,2);
    v_active_adjustments NUMERIC(14,2);
    v_net_charge_debt NUMERIC(14,2);
    v_allocate_now NUMERIC(14,2);
    v_allocations_created INT := 0;
BEGIN
    v_caller_id := auth.uid();

    -- Whitelist estricta de autorización: Exclusivamente service_role o authenticated con role='admin'
    IF auth.role() = 'service_role' THEN
        -- Permitido
    ELSIF auth.role() = 'authenticated' AND v_caller_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE id = v_caller_id AND role = 'admin'
        ) INTO v_is_admin;

        IF NOT v_is_admin THEN
            RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios administrativos para procesar asignaciones.';
        END IF;
    ELSE
        RAISE EXCEPTION 'Acceso denegado. Contexto de ejecución no autorizado.';
    END IF;

    -- Obtener y bloquear el pago para procesamiento exclusivo
    SELECT * INTO v_payment FROM public.membership_payments WHERE id = p_payment_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pago no encontrado.');
    END IF;

    IF v_payment.status != 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Solo se pueden procesar pagos en estado completed.');
    END IF;

    -- Bloquear asociacion
    PERFORM 1 FROM public.associates WHERE id = v_payment.associate_id FOR UPDATE;

    SELECT COALESCE(SUM(mpa.amount), 0) INTO v_active_allocations
    FROM public.membership_payment_allocations mpa
    WHERE mpa.payment_id = v_payment.id AND mpa.reversed_at IS NULL;

    v_unallocated_amount := v_payment.amount - v_active_allocations;

    IF v_unallocated_amount <= 0 THEN
        RETURN jsonb_build_object('success', true, 'message', 'El pago ya se encuentra totalmente asignado.', 'allocations_created', 0);
    END IF;

    -- Recorrer cargos OPEN FIFO
    FOR v_charge IN
        SELECT * FROM public.membership_charges
        WHERE associate_id = v_payment.associate_id
          AND admin_status = 'open'
          AND currency = v_payment.currency
        ORDER BY due_date ASC, created_at ASC
        FOR UPDATE
    LOOP
        EXIT WHEN v_unallocated_amount <= 0;

        SELECT COALESCE(SUM(pa.amount), 0) INTO v_active_allocations
        FROM public.membership_payment_allocations pa
        JOIN public.membership_payments p ON p.id = pa.payment_id
        WHERE pa.charge_id = v_charge.id
          AND pa.reversed_at IS NULL
          AND p.status = 'completed';

        SELECT 
            COALESCE(SUM(CASE WHEN ma.type IN ('waiver', 'discount', 'write_off') THEN ma.amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN ma.type = 'reversal' THEN ma.amount ELSE 0 END), 0)
        INTO v_active_adjustments
        FROM public.membership_adjustments ma
        WHERE ma.charge_id = v_charge.id;

        v_net_charge_debt := GREATEST(0, v_charge.original_amount - v_active_allocations - v_active_adjustments);

        IF v_net_charge_debt > 0 THEN
            v_allocate_now := LEAST(v_unallocated_amount, v_net_charge_debt);

            INSERT INTO public.membership_payment_allocations (payment_id, charge_id, amount)
            VALUES (v_payment.id, v_charge.id, v_allocate_now);

            v_unallocated_amount := v_unallocated_amount - v_allocate_now;
            v_allocations_created := v_allocations_created + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment.id,
        'allocations_created', v_allocations_created,
        'unallocated_credit', v_unallocated_amount
    );
END;
$$;

-- B. RPC: allocate_unallocated_credit (Asigna Crédito Preexistente)
CREATE OR REPLACE FUNCTION public.allocate_unallocated_credit(p_associate_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_is_admin BOOLEAN := false;
    v_payment RECORD;
    v_result JSONB;
    v_total_processed INT := 0;
BEGIN
    v_caller_id := auth.uid();

    -- Whitelist estricta de autorización
    IF auth.role() = 'service_role' THEN
        -- Permitido
    ELSIF auth.role() = 'authenticated' AND v_caller_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE id = v_caller_id AND role = 'admin'
        ) INTO v_is_admin;

        IF NOT v_is_admin THEN
            RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios administrativos para asignar crédito.';
        END IF;
    ELSE
        RAISE EXCEPTION 'Acceso denegado. Contexto de ejecución no autorizado.';
    END IF;

    PERFORM 1 FROM public.associates WHERE id = p_associate_id FOR UPDATE;

    FOR v_payment IN
        SELECT p.id FROM public.membership_payments p
        WHERE p.associate_id = p_associate_id AND p.status = 'completed'
        ORDER BY p.paid_at ASC, p.created_at ASC
    LOOP
        v_result := public.process_membership_payment(v_payment.id);
        IF (v_result->>'allocations_created')::INT > 0 THEN
            v_total_processed := v_total_processed + (v_result->>'allocations_created')::INT;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'total_allocations_created', v_total_processed);
END;
$$;

-- C. RPC: reverse_membership_payment (Reversión Total Auditable)
CREATE OR REPLACE FUNCTION public.reverse_membership_payment(
    p_payment_id UUID,
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
    v_payment RECORD;
BEGIN
    v_caller_id := auth.uid();

    -- Whitelist estricta de autorización
    IF auth.role() = 'service_role' THEN
        -- Permitido
    ELSIF auth.role() = 'authenticated' AND v_caller_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE id = v_caller_id AND role = 'admin'
        ) INTO v_is_admin;

        IF NOT v_is_admin THEN
            RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios administrativos para revertir pagos.';
        END IF;
    ELSE
        RAISE EXCEPTION 'Acceso denegado. Contexto de ejecución no autorizado.';
    END IF;

    SELECT * INTO v_payment FROM public.membership_payments WHERE id = p_payment_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pago no encontrado.');
    END IF;

    IF v_payment.status != 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Solo se pueden revertir pagos en estado completed.');
    END IF;

    -- 1. Marcar pago como refunded
    UPDATE public.membership_payments SET status = 'refunded' WHERE id = p_payment_id;

    -- 2. Estampar asignaciones como revertidas (sin eliminar filas)
    UPDATE public.membership_payment_allocations
    SET reversed_at = timezone('utc'::text, now()),
        reversed_by = v_caller_id,
        reversal_reason = p_reason
    WHERE payment_id = p_payment_id
      AND reversed_at IS NULL;

    RETURN jsonb_build_object('success', true, 'payment_id', p_payment_id, 'status', 'refunded');
END;
$$;

-- 14. RESTICCIÓN DE EJECUCIÓN (REVOKE / GRANT) DE RPCs FINANCIERAS
REVOKE EXECUTE ON FUNCTION public.process_membership_payment(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.allocate_unallocated_credit(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reverse_membership_payment(UUID, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_membership_payment(UUID) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_unallocated_credit(UUID) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_membership_payment(UUID, TEXT) TO service_role, authenticated;

-- 15. SEED DE CONFIGURACIÓN EN site_settings
INSERT INTO public.site_settings (id, data)
VALUES (
    'membership',
    jsonb_build_object(
        'billing_enabled', true,
        'default_currency', 'COP',
        'payment_allocation_strategy', 'fifo',
        'portal_access_when_overdue', true,
        'credential_validity_rule', 'gremial_status_only'
    )
)
ON CONFLICT (id) DO UPDATE
SET data = COALESCE(public.site_settings.data, '{}'::jsonb) || jsonb_build_object(
    'billing_enabled', COALESCE(public.site_settings.data->'billing_enabled', 'true'::jsonb),
    'default_currency', COALESCE(public.site_settings.data->'default_currency', '"COP"'::jsonb),
    'payment_allocation_strategy', COALESCE(public.site_settings.data->'payment_allocation_strategy', '"fifo"'::jsonb),
    'portal_access_when_overdue', COALESCE(public.site_settings.data->'portal_access_when_overdue', 'true'::jsonb),
    'credential_validity_rule', COALESCE(public.site_settings.data->'credential_validity_rule', '"gremial_status_only"'::jsonb)
);

-- 16. SEED DE CATEGORÍA INICIAL CONFIRMADA EN ESTATUTOS
INSERT INTO public.membership_categories (name, description, is_active)
VALUES ('Miembro de Número', 'Asociado médico especialista en Ginecología y Obstetricia con derecho a voto y ejercicio gremial pleno.', true)
ON CONFLICT (name) DO NOTHING;

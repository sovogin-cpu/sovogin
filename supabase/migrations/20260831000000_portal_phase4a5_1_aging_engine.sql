-- Migration: 20260831_portal_phase4a5_1_aging_engine.sql
-- Description: Motor de Antigüedad de Cartera / Aging Engine (Fase 4A5.1 Hardened)
-- Implementación determinista, auditable y segura.

-- 1. VISTA DE SALDOS NETOS POR CARGO: public.vw_membership_charge_balances
-- Nota de seguridad: Se define con security_barrier = true y permiso REVOKE ALL para authenticated/anon.
CREATE OR REPLACE VIEW public.vw_membership_charge_balances
WITH (security_barrier = true) AS
SELECT
    c.id AS charge_id,
    c.associate_id,
    c.membership_id,
    c.concept,
    c.original_amount,
    c.currency,
    c.due_date,
    c.period_start,
    c.period_end,
    c.billing_cycle_key,
    c.admin_status,
    c.source,
    c.created_at,
    c.updated_at,
    COALESCE(pa_agg.total_allocated, 0::numeric) AS allocated_amount,
    COALESCE(adj_agg.net_adjustments, 0::numeric) AS adjustments_amount,
    CASE
        WHEN c.admin_status = 'cancelled' THEN 0::numeric
        ELSE GREATEST(0::numeric, c.original_amount - COALESCE(pa_agg.total_allocated, 0::numeric) - COALESCE(adj_agg.net_adjustments, 0::numeric))
    END AS net_debt
FROM public.membership_charges c
LEFT JOIN (
    SELECT
        pa.charge_id,
        SUM(pa.amount) AS total_allocated
    FROM public.membership_payment_allocations pa
    JOIN public.membership_payments p ON p.id = pa.payment_id
    WHERE pa.reversed_at IS NULL
      AND p.status = 'completed'
    GROUP BY pa.charge_id
) pa_agg ON pa_agg.charge_id = c.id
LEFT JOIN (
    SELECT
        ma.charge_id,
        SUM(
            CASE
                WHEN ma.type IN ('waiver', 'discount', 'write_off')
                     AND NOT EXISTS (
                         SELECT 1 FROM public.membership_adjustments rev
                         WHERE rev.reverses_adjustment_id = ma.id
                           AND rev.type = 'reversal'
                     )
                THEN ma.amount
                ELSE 0
            END
        ) AS net_adjustments
    FROM public.membership_adjustments ma
    WHERE ma.charge_id IS NOT NULL
    GROUP BY ma.charge_id
) adj_agg ON adj_agg.charge_id = c.id;

-- SEGURIDAD ESTRUCTURAL: Revocar todo acceso directo a la vista para el rol público, anónimo y autenticado.
REVOKE ALL ON public.vw_membership_charge_balances FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.vw_membership_charge_balances TO service_role;

-- 2. ÍNDICES DE OPTIMIZACIÓN DE CARTERA
CREATE INDEX IF NOT EXISTS idx_mb_charges_aging
ON public.membership_charges (associate_id, due_date)
WHERE admin_status = 'open';

-- 3. RPC PRIVILEGIADA: public.get_membership_aging_report
-- Utiliza SECURITY DEFINER con search_path completamente vacío ('') y nombres de símbolos 100% calificados.
CREATE OR REPLACE FUNCTION public.get_membership_aging_report(
    p_as_of_date DATE DEFAULT NULL,
    p_associate_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_is_admin BOOLEAN := false;
    v_eval_date DATE;
    v_target_associate_id UUID := p_associate_id;
    v_associate_results JSONB;
    v_portfolio_summary JSONB;
BEGIN
    v_caller_id := auth.uid();
    v_eval_date := COALESCE(p_as_of_date, (pg_catalog.timezone('America/Bogota'::text, pg_catalog.now()))::date);

    -- Control Estricto de Autorización y Aislamiento por Asociado
    IF auth.role() = 'service_role' THEN
        -- Permitido total
    ELSIF auth.role() = 'authenticated' AND v_caller_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE id = v_caller_id AND role = 'admin'
        ) INTO v_is_admin;

        IF NOT v_is_admin THEN
            -- Asociado regular: forzar filtrado estricto a su propio associate_id registrado
            SELECT id INTO v_target_associate_id
            FROM public.associates
            WHERE user_id = v_caller_id;

            IF v_target_associate_id IS NULL THEN
                RAISE EXCEPTION 'Acceso denegado. El usuario no posee un registro de asociado vinculado.';
            END IF;
        END IF;
    ELSE
        RAISE EXCEPTION 'Acceso denegado. Contexto de ejecución no autorizado.';
    END IF;

    -- CTE 1: Agregación previa de cargos por asociado sin riesgo de multiplicación cartesiana
    WITH associate_charge_totals AS (
        SELECT
            b.associate_id,
            b.due_date,
            b.net_debt,
            GREATEST(0, (v_eval_date - b.due_date)) AS dpd,
            CASE WHEN b.due_date >= v_eval_date THEN b.net_debt ELSE 0 END AS current_amt,
            CASE WHEN (v_eval_date - b.due_date) BETWEEN 1 AND 30 THEN b.net_debt ELSE 0 END AS d1_30,
            CASE WHEN (v_eval_date - b.due_date) BETWEEN 31 AND 60 THEN b.net_debt ELSE 0 END AS d31_60,
            CASE WHEN (v_eval_date - b.due_date) BETWEEN 61 AND 90 THEN b.net_debt ELSE 0 END AS d61_90,
            CASE WHEN (v_eval_date - b.due_date) BETWEEN 91 AND 120 THEN b.net_debt ELSE 0 END AS d91_120,
            CASE WHEN (v_eval_date - b.due_date) > 120 THEN b.net_debt ELSE 0 END AS d_over_120
        FROM public.vw_membership_charge_balances b
        WHERE b.admin_status = 'open'
          AND b.net_debt > 0
          AND (v_target_associate_id IS NULL OR b.associate_id = v_target_associate_id)
    ),
    -- CTE 2: Agregación limpia garantizando exactamente 1 fila por asociado
    associate_agg AS (
        SELECT
            a.id AS associate_id,
            a.full_name,
            a.document_number,
            a.email,
            (
                SELECT m.id
                FROM public.associate_memberships m
                WHERE m.associate_id = a.id
                ORDER BY
                    CASE
                        WHEN m.billing_status = 'active' THEN 1
                        WHEN m.billing_status = 'paused' THEN 2
                        ELSE 3
                    END ASC,
                    m.started_at DESC,
                    m.created_at DESC,
                    m.id ASC
                LIMIT 1
            ) AS membership_id,
            COALESCE(SUM(ac.net_debt), 0::numeric) AS total_outstanding,
            COUNT(ac.due_date)::integer AS open_charge_count,
            MIN(ac.due_date) AS oldest_unpaid_due_date,
            COALESCE(SUM(ac.current_amt), 0::numeric) AS current_amount,
            COALESCE(SUM(ac.d1_30), 0::numeric) AS days_1_30,
            COALESCE(SUM(ac.d31_60), 0::numeric) AS days_31_60,
            COALESCE(SUM(ac.d61_90), 0::numeric) AS days_61_90,
            COALESCE(SUM(ac.d91_120), 0::numeric) AS days_91_120,
            COALESCE(SUM(ac.d_over_120), 0::numeric) AS days_over_120
        FROM public.associates a
        LEFT JOIN associate_charge_totals ac ON ac.associate_id = a.id
        WHERE (v_target_associate_id IS NULL OR a.id = v_target_associate_id)
        GROUP BY a.id, a.full_name, a.document_number, a.email
    ),
    -- CTE 3: Cálculo exacto de días de mora por asociado
    associate_calculated AS (
        SELECT
            agg.*,
            CASE
                WHEN agg.total_outstanding = 0 OR agg.oldest_unpaid_due_date IS NULL THEN 0
                WHEN agg.oldest_unpaid_due_date >= v_eval_date THEN 0
                ELSE (v_eval_date - agg.oldest_unpaid_due_date)
            END AS days_past_due
        FROM associate_agg agg
    ),
    -- CTE 4: Asignación determinista de buckets y account_status
    associate_final AS (
        SELECT
            c.*,
            CASE
                WHEN c.total_outstanding = 0 OR c.days_past_due = 0 THEN 'CURRENT'
                WHEN c.days_past_due BETWEEN 1 AND 30 THEN '1-30 días'
                WHEN c.days_past_due BETWEEN 31 AND 60 THEN '31-60 días'
                WHEN c.days_past_due BETWEEN 61 AND 90 THEN '61-90 días'
                WHEN c.days_past_due BETWEEN 91 AND 120 THEN '91-120 días'
                ELSE '+120 días'
            END AS aging_bucket,
            CASE
                WHEN c.total_outstanding = 0 THEN 'AL DÍA'
                WHEN c.days_past_due = 0 THEN 'PENDIENTE'
                ELSE 'EN MORA'
            END AS account_status
        FROM associate_calculated c
    )
    SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
            'associate_id', f.associate_id,
            'full_name', f.full_name,
            'document_number', f.document_number,
            'email', f.email,
            'membership_id', f.membership_id,
            'total_outstanding', f.total_outstanding,
            'open_charge_count', f.open_charge_count,
            'oldest_unpaid_due_date', f.oldest_unpaid_due_date,
            'days_past_due', f.days_past_due,
            'aging_bucket', f.aging_bucket,
            'account_status', f.account_status,
            'current_amount', f.current_amount,
            'days_1_30', f.days_1_30,
            'days_31_60', f.days_31_60,
            'days_61_90', f.days_61_90,
            'days_91_120', f.days_91_120,
            'days_over_120', f.days_over_120
        ) ORDER BY f.days_past_due DESC, f.total_outstanding DESC, f.full_name ASC
    ) INTO v_associate_results
    FROM associate_final f;

    IF v_associate_results IS NULL THEN
        v_associate_results := '[]'::jsonb;
    END IF;

    -- CTE 5: Totalización del Portafolio
    SELECT pg_catalog.jsonb_build_object(
        'as_of_date', v_eval_date,
        'total_associates', pg_catalog.jsonb_array_length(v_associate_results),
        'total_outstanding', COALESCE(SUM((item->>'total_outstanding')::numeric), 0::numeric),
        'total_open_charges', COALESCE(SUM((item->>'open_charge_count')::integer), 0),
        'current_amount', COALESCE(SUM((item->>'current_amount')::numeric), 0::numeric),
        'days_1_30', COALESCE(SUM((item->>'days_1_30')::numeric), 0::numeric),
        'days_31_60', COALESCE(SUM((item->>'days_31_60')::numeric), 0::numeric),
        'days_61_90', COALESCE(SUM((item->>'days_61_90')::numeric), 0::numeric),
        'days_91_120', COALESCE(SUM((item->>'days_91_120')::numeric), 0::numeric),
        'days_over_120', COALESCE(SUM((item->>'days_over_120')::numeric), 0::numeric),
        'associates_al_dia', COALESCE(SUM(CASE WHEN item->>'account_status' = 'AL DÍA' THEN 1 ELSE 0 END), 0),
        'associates_pendiente', COALESCE(SUM(CASE WHEN item->>'account_status' = 'PENDIENTE' THEN 1 ELSE 0 END), 0),
        'associates_en_mora', COALESCE(SUM(CASE WHEN item->>'account_status' = 'EN MORA' THEN 1 ELSE 0 END), 0)
    ) INTO v_portfolio_summary
    FROM pg_catalog.jsonb_array_elements(v_associate_results) AS item;

    IF v_portfolio_summary IS NULL THEN
        v_portfolio_summary := pg_catalog.jsonb_build_object(
            'as_of_date', v_eval_date,
            'total_associates', 0,
            'total_outstanding', 0,
            'total_open_charges', 0,
            'current_amount', 0,
            'days_1_30', 0,
            'days_31_60', 0,
            'days_61_90', 0,
            'days_91_120', 0,
            'days_over_120', 0,
            'associates_al_dia', 0,
            'associates_pendiente', 0,
            'associates_en_mora', 0
        );
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'as_of_date', v_eval_date,
        'summary', v_portfolio_summary,
        'associates', v_associate_results
    );
END;
$$;

-- RESTRICCIONES Y PERMISOS DE EJECUCIÓN
REVOKE EXECUTE ON FUNCTION public.get_membership_aging_report(DATE, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_membership_aging_report(DATE, UUID) TO authenticated, service_role;

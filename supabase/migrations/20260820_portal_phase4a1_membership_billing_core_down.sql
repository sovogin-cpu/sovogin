-- Rollback Migration: 20260820_portal_phase4a1_membership_billing_core_down.sql
-- Description: Reversión limpia, estricta e idempotente de las 8 tablas, triggers, RPCs y políticas RLS (Fase 4A1)

-- 1. REVOCAR Y ELIMINAR FUNCIONES RPC TRANSACCIONALES
REVOKE EXECUTE ON FUNCTION public.reverse_membership_payment(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.allocate_unallocated_credit(UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.process_membership_payment(UUID) FROM PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.reverse_membership_payment(UUID, TEXT);
DROP FUNCTION IF EXISTS public.allocate_unallocated_credit(UUID);
DROP FUNCTION IF EXISTS public.process_membership_payment(UUID);

-- 2. ELIMINAR TRIGGERS Y FUNCIONES DE INTEGRIDAD DB
DROP TRIGGER IF EXISTS trg_validate_adjustment ON public.membership_adjustments;
DROP TRIGGER IF EXISTS trg_validate_allocation ON public.membership_payment_allocations;
DROP TRIGGER IF EXISTS trg_prevent_cancelled_charge ON public.membership_charges;

DROP TRIGGER IF EXISTS trg_immutability_adjustments ON public.membership_adjustments;
DROP TRIGGER IF EXISTS trg_immutability_allocations ON public.membership_payment_allocations;
DROP TRIGGER IF EXISTS trg_immutability_payments ON public.membership_payments;
DROP TRIGGER IF EXISTS trg_immutability_charges ON public.membership_charges;

DROP FUNCTION IF EXISTS public.fn_validate_membership_adjustment();
DROP FUNCTION IF EXISTS public.fn_validate_payment_allocation();
DROP FUNCTION IF EXISTS public.fn_prevent_cancelled_charge_with_allocations();
DROP FUNCTION IF EXISTS public.fn_protect_financial_immutability();

-- 3. ELIMINAR ÍNDICES
DROP INDEX IF EXISTS public.idx_unique_adjustment_reversal;
DROP INDEX IF EXISTS public.idx_mb_adjustments_charge;
DROP INDEX IF EXISTS public.idx_mb_allocations_charge;
DROP INDEX IF EXISTS public.idx_mb_allocations_payment;
DROP INDEX IF EXISTS public.idx_mb_payments_assoc;
DROP INDEX IF EXISTS public.idx_mb_charges_fifo;
DROP INDEX IF EXISTS public.idx_assoc_mb_associate;

-- 4. ELIMINAR POLÍTICAS RLS EN ORDEN DE TABLAS
DROP POLICY IF EXISTS "Asociado ve sus propios ajustes" ON public.membership_adjustments;
DROP POLICY IF EXISTS "Admin gestiona ajustes de membresia" ON public.membership_adjustments;

DROP POLICY IF EXISTS "Asociado ve sus propias asignaciones de pago" ON public.membership_payment_allocations;
DROP POLICY IF EXISTS "Admin gestiona asignaciones de pago" ON public.membership_payment_allocations;

DROP POLICY IF EXISTS "Asociado ve sus propios pagos" ON public.membership_payments;
DROP POLICY IF EXISTS "Admin gestiona pagos de membresia" ON public.membership_payments;

DROP POLICY IF EXISTS "Asociado ve sus propios cargos" ON public.membership_charges;
DROP POLICY IF EXISTS "Admin gestiona cargos de membresia" ON public.membership_charges;

DROP POLICY IF EXISTS "Asociado ve historial de planes propios" ON public.membership_plan_changes;
DROP POLICY IF EXISTS "Admin gestiona historial de planes" ON public.membership_plan_changes;

DROP POLICY IF EXISTS "Asociado ve su propia cuenta de membresia" ON public.associate_memberships;
DROP POLICY IF EXISTS "Admin gestiona cuentas de membresia" ON public.associate_memberships;

DROP POLICY IF EXISTS "Lectura de planes de membresia" ON public.membership_plans;
DROP POLICY IF EXISTS "Admin gestiona planes de membresia" ON public.membership_plans;

DROP POLICY IF EXISTS "Lectura de categorias de membresia" ON public.membership_categories;
DROP POLICY IF EXISTS "Admin gestiona categorias de membresia" ON public.membership_categories;

-- 5. ELIMINAR TABLAS NUEVAS EN ORDEN SEGURO DE CLAVES FORÁNEAS (SIN CASCADE PARA SEGURIDAD)
DROP TABLE IF EXISTS public.membership_adjustments;
DROP TABLE IF EXISTS public.membership_payment_allocations;
DROP TABLE IF EXISTS public.membership_payments;
DROP TABLE IF EXISTS public.membership_charges;
DROP TABLE IF EXISTS public.membership_plan_changes;
DROP TABLE IF EXISTS public.associate_memberships;
DROP TABLE IF EXISTS public.membership_plans;
DROP TABLE IF EXISTS public.membership_categories;

-- NOTA: public.site_settings no se elimina para preservar la integridad de la configuración global del sitio.

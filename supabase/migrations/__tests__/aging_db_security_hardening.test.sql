-- DB / SQL Integration & Security Test Script: FASE 4A5.1-H1 Hardening
-- Archivo de documentación y verificación SQL para ejecutar contra entorno PostgreSQL / Supabase local.

BEGIN;

-- 1. VERIFICAR PERMISOS EN VISTA vw_membership_charge_balances
-- Demostración: El rol 'authenticated' o 'anon' NO debe tener SELECT directo sobre la vista.
DO $$
DECLARE
    v_has_access BOOLEAN;
BEGIN
    SELECT has_table_privilege('authenticated', 'public.vw_membership_charge_balances', 'SELECT') INTO v_has_access;
    IF v_has_access THEN
        RAISE EXCEPTION 'PRUEBA FALLIDA: El rol authenticated posee acceso SELECT directo sobre la vista!';
    ELSE
        RAISE NOTICE 'PRUEBA EXITOSA (1): Rol authenticated NO tiene acceso SELECT directo a vw_membership_charge_balances.';
    END IF;

    SELECT has_table_privilege('anon', 'public.vw_membership_charge_balances', 'SELECT') INTO v_has_access;
    IF v_has_access THEN
        RAISE EXCEPTION 'PRUEBA FALLIDA: El rol anon posee acceso SELECT directo sobre la vista!';
    ELSE
        RAISE NOTICE 'PRUEBA EXITOSA (2): Rol anon NO tiene acceso SELECT directo a vw_membership_charge_balances.';
    END IF;
END $$;

-- 2. VERIFICAR ATRIBUTO SECURITY DEFINER Y SEARCH_PATH VACÍO EN RPC
DO $$
DECLARE
    v_proc RECORD;
BEGIN
    SELECT p.prosecdef, p.proconfig
    INTO v_proc
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_membership_aging_report';

    IF NOT v_proc.prosecdef THEN
        RAISE EXCEPTION 'PRUEBA FALLIDA: RPC get_membership_aging_report no es SECURITY DEFINER!';
    END IF;

    IF v_proc.proconfig IS NULL OR NOT ('search_path=""' = ANY(v_proc.proconfig) OR 'search_path=' = ANY(v_proc.proconfig)) THEN
        RAISE EXCEPTION 'PRUEBA FALLIDA: RPC get_membership_aging_report no posee SET search_path = ''''!';
    END IF;

    RAISE NOTICE 'PRUEBA EXITOSA (3): RPC es SECURITY DEFINER y tiene search_path = '''' calificado.';
END $$;

ROLLBACK;

-- DB / SQL Integration & Security Hardening Test Script: FASE 4A5.2-A.H2 Collections Foundation
-- Verificación transaccional real para ejecutar contra PostgreSQL / Supabase local.

BEGIN;

-- 1. VERIFICAR EXISTENCIA DE LA TABLA Y RLS
DO $$
DECLARE
    v_rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'collection_actions';

    IF v_rls_enabled IS NULL THEN
        RAISE EXCEPTION 'PRUEBA FALLIDA: La tabla public.collection_actions no existe!';
    END IF;

    IF NOT v_rls_enabled THEN
        RAISE EXCEPTION 'PRUEBA FALLIDA: RLS no está habilitado en public.collection_actions!';
    ELSE
        RAISE NOTICE 'PRUEBA EXITOSA (1): La tabla public.collection_actions existe y posee RLS habilitado.';
    END IF;
END $$;

-- 2. VERIFICAR PERMISOS Y PRIVILEGIOS POR ROL (SELECT/INSERT SÓLO; NO UPDATE, NO DELETE)
DO $$
DECLARE
    v_has_select BOOLEAN;
    v_has_insert BOOLEAN;
    v_has_update BOOLEAN;
    v_has_delete BOOLEAN;
BEGIN
    -- Rol anon: Cero acceso
    SELECT has_table_privilege('anon', 'public.collection_actions', 'SELECT') INTO v_has_select;
    IF v_has_select THEN
        RAISE EXCEPTION 'PRUEBA FALLIDA: El rol anon posee acceso SELECT directo sobre collection_actions!';
    ELSE
        RAISE NOTICE 'PRUEBA EXITOSA (2): Rol anon NO tiene acceso SELECT a collection_actions.';
    END IF;

    -- Rol authenticated: Debe poseer SELECT e INSERT, pero NO UPDATE ni DELETE directos
    SELECT has_table_privilege('authenticated', 'public.collection_actions', 'SELECT') INTO v_has_select;
    SELECT has_table_privilege('authenticated', 'public.collection_actions', 'INSERT') INTO v_has_insert;
    SELECT has_table_privilege('authenticated', 'public.collection_actions', 'UPDATE') INTO v_has_update;
    SELECT has_table_privilege('authenticated', 'public.collection_actions', 'DELETE') INTO v_has_delete;

    IF NOT (v_has_select AND v_has_insert) THEN
        RAISE EXCEPTION 'PRUEBA FALLIDA: El rol authenticated no posee privilegios SELECT/INSERT!';
    END IF;

    IF v_has_update OR v_has_delete THEN
        RAISE EXCEPTION 'PRUEBA FALLIDA: El rol authenticated posee privilegios mutativos UPDATE/DELETE innecesarios!';
    ELSE
        RAISE NOTICE 'PRUEBA EXITOSA (3): Rol authenticated posee SELECT/INSERT y NO posee UPDATE ni DELETE (bitácora append-only).';
    END IF;
END $$;

-- 3. VERIFICAR RESTRICCIONES DE CLAVES FORÁNEAS (RESTRICT EN LUGAR DE CASCADE)
DO $$
DECLARE
    v_assoc_fk_rule TEXT;
    v_perf_fk_rule TEXT;
BEGIN
    SELECT confdeltype INTO v_assoc_fk_rule
    FROM pg_constraint
    WHERE conname LIKE '%collection_actions_associate_id_fkey%' OR (conrelid = 'public.collection_actions'::regclass AND confrelid = 'public.associates'::regclass);

    SELECT confdeltype INTO v_perf_fk_rule
    FROM pg_constraint
    WHERE conname LIKE '%collection_actions_performed_by_fkey%' OR (conrelid = 'public.collection_actions'::regclass AND confrelid = 'public.profiles'::regclass);

    IF v_assoc_fk_rule NOT IN ('r', 'a') THEN
        RAISE EXCEPTION 'PRUEBA FALLIDA: FK associate_id no utiliza RESTRICT (encontrado: %)!', v_assoc_fk_rule;
    ELSE
        RAISE NOTICE 'PRUEBA EXITOSA (4): FK associate_id utiliza RESTRICT (preserva auditabilidad).';
    END IF;

    IF v_perf_fk_rule NOT IN ('r', 'a') THEN
        RAISE EXCEPTION 'PRUEBA FALLIDA: FK performed_by no utiliza RESTRICT (encontrado: %)!', v_perf_fk_rule;
    ELSE
        RAISE NOTICE 'PRUEBA EXITOSA (5): FK performed_by utiliza RESTRICT (preserva auditabilidad).';
    END IF;
END $$;

-- 4. VERIFICAR COMPORTAMIENTO RLS REAL ADMIN VS NON-ADMIN Y ANTI-SPOOFING
DO $$
DECLARE
    v_admin_id UUID := gen_random_uuid();
    v_other_admin_id UUID := gen_random_uuid();
    v_member_id UUID := gen_random_uuid();
    v_assoc_id UUID := gen_random_uuid();
    v_inserted_id UUID;
    v_read_count INTEGER;
BEGIN
    -- Fixtures temporales transaccionales
    INSERT INTO auth.users (id, email) VALUES (v_admin_id, 'admin_main@test.com');
    INSERT INTO auth.users (id, email) VALUES (v_other_admin_id, 'admin_other@test.com');
    INSERT INTO auth.users (id, email) VALUES (v_member_id, 'member_regular@test.com');

    UPDATE public.profiles SET role = 'admin', full_name = 'Admin Principal' WHERE id = v_admin_id;
    UPDATE public.profiles SET role = 'admin', full_name = 'Otro Admin' WHERE id = v_other_admin_id;
    UPDATE public.profiles SET role = 'member', full_name = 'Usuario Regular' WHERE id = v_member_id;

    INSERT INTO public.associates (id, full_name, email, status) VALUES (v_assoc_id, 'Asociado Test', 'assoc_test@test.com', 'active');

    -- Simular contexto de ejecución RLS como admin principal
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_admin_id), true);
    SET LOCAL ROLE authenticated;

    -- Intento A: Admin INSERT legítimo con performed_by = auth.uid()
    INSERT INTO public.collection_actions (associate_id, performed_by, channel, action_type, result_status, notes)
    VALUES (v_assoc_id, v_admin_id, 'phone', 'follow_up', 'contacted', 'Gestión válida por admin propio')
    RETURNING id INTO v_inserted_id;

    IF v_inserted_id IS NULL THEN
        RAISE EXCEPTION 'PRUEBA FALLIDA: INSERT legítimo por admin fue rechazado por RLS!';
    ELSE
        RAISE NOTICE 'PRUEBA EXITOSA (6): Admin puede insertar gestiones con performed_by = auth.uid().';
    END IF;

    -- Intento B: Admin INSERT anti-spoofing (performed_by != auth.uid())
    BEGIN
        INSERT INTO public.collection_actions (associate_id, performed_by, channel, action_type, result_status, notes)
        VALUES (v_assoc_id, v_other_admin_id, 'phone', 'follow_up', 'contacted', 'Gestión suplantando a otro admin');

        RAISE EXCEPTION 'PRUEBA FALLIDA: RLS permitió suplantación de performed_by != auth.uid()!';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%PRUEBA FALLIDA%' THEN
            RAISE;
        ELSE
            RAISE NOTICE 'PRUEBA EXITOSA (7): RLS bloqueó intento de suplantación con performed_by != auth.uid().';
        END IF;
    END;

    -- Intento C: Non-Admin SELECT (debe retornar 0 filas)
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_member_id), true);
    SET LOCAL ROLE authenticated;

    SELECT COUNT(*) INTO v_read_count FROM public.collection_actions;
    IF v_read_count > 0 THEN
        RAISE EXCEPTION 'PRUEBA FALLIDA: Non-admin pudo leer % filas via RLS en collection_actions!', v_read_count;
    ELSE
        RAISE NOTICE 'PRUEBA EXITOSA (8): Non-admin SELECT retorna 0 filas por RLS.';
    END IF;

    -- Intento D: Non-Admin INSERT (debe ser rechazado por RLS)
    BEGIN
        INSERT INTO public.collection_actions (associate_id, performed_by, channel, action_type, result_status, notes)
        VALUES (v_assoc_id, v_member_id, 'phone', 'follow_up', 'contacted', 'Intento de registro por no-admin');

        RAISE EXCEPTION 'PRUEBA FALLIDA: RLS permitió INSERT por parte de usuario non-admin!';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%PRUEBA FALLIDA%' THEN
            RAISE;
        ELSE
            RAISE NOTICE 'PRUEBA EXITOSA (9): RLS bloqueó el intento de INSERT por parte de usuario non-admin.';
        END IF;
    END;
END $$;

ROLLBACK;

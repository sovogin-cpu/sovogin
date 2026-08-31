-- Migration: 20260821_portal_phase4a2_membership_plan_management.sql
-- Description: RPC Atómica para Cambio Seguro y Auditable de Plan de Membresía (Fase 4A2)

-- RPC: public.change_associate_membership_plan (Cambio Atómico Transaccional de Plan)
CREATE OR REPLACE FUNCTION public.change_associate_membership_plan(
    p_associate_id UUID,
    p_new_plan_id UUID,
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
    v_membership RECORD;
    v_new_plan RECORD;
    v_old_plan_id UUID;
    v_clean_reason TEXT;
BEGIN
    v_caller_id := auth.uid();
    v_clean_reason := trim(p_reason);

    -- 1. Whitelist estricta de autorización (service_role o admin autenticado)
    IF auth.role() = 'service_role' THEN
        -- Permitido
    ELSIF auth.role() = 'authenticated' AND v_caller_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE id = v_caller_id AND role = 'admin'
        ) INTO v_is_admin;

        IF NOT v_is_admin THEN
            RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios administrativos para cambiar el plan de membresía.';
        END IF;
    ELSE
        RAISE EXCEPTION 'Acceso denegado. Contexto de ejecución no autorizado.';
    END IF;

    -- 2. Validar parámetros de entrada
    IF p_associate_id IS NULL THEN
        RAISE EXCEPTION 'El id del asociado es obligatorio.';
    END IF;

    IF p_new_plan_id IS NULL THEN
        RAISE EXCEPTION 'El id del nuevo plan es obligatorio.';
    END IF;

    IF v_clean_reason IS NULL OR length(v_clean_reason) < 3 THEN
        RAISE EXCEPTION 'El motivo del cambio de plan es obligatorio y debe tener al menos 3 caracteres.';
    END IF;

    -- 3. Verificar y bloquear la cuenta de membresía existente
    SELECT * INTO v_membership
    FROM public.associate_memberships
    WHERE associate_id = p_associate_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El asociado no posee una cuenta de membresía activa. Asigne un plan inicial primero.';
    END IF;

    v_old_plan_id := v_membership.membership_plan_id;

    -- 4. Verificar que el nuevo plan existe y está activo
    SELECT * INTO v_new_plan
    FROM public.membership_plans
    WHERE id = p_new_plan_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El nuevo plan especificado no existe.';
    END IF;

    IF NOT v_new_plan.is_active THEN
        RAISE EXCEPTION 'El plan seleccionado se encuentra inactivo y no puede ser asignado.';
    END IF;

    -- 5. Idempotencia / Validar que el plan sea diferente al actual
    IF v_old_plan_id IS NOT DISTINCT FROM p_new_plan_id THEN
        RAISE EXCEPTION 'El asociado ya se encuentra asignado a este plan de membresía.';
    END IF;

    -- 6. Operación Atómica 1: Actualizar associate_memberships
    UPDATE public.associate_memberships
    SET membership_plan_id = p_new_plan_id,
        updated_at = timezone('utc'::text, now())
    WHERE associate_id = p_associate_id;

    -- 7. Operación Atómica 2: Insertar registro de auditoría en membership_plan_changes
    INSERT INTO public.membership_plan_changes (
        associate_id,
        old_plan_id,
        new_plan_id,
        reason,
        changed_by,
        changed_at
    ) VALUES (
        p_associate_id,
        v_old_plan_id,
        p_new_plan_id,
        v_clean_reason,
        v_caller_id,
        timezone('utc'::text, now())
    );

    -- 8. Retornar resumen estructurado
    RETURN jsonb_build_object(
        'success', true,
        'associate_id', p_associate_id,
        'old_plan_id', v_old_plan_id,
        'new_plan_id', p_new_plan_id,
        'reason', v_clean_reason
    );
END;
$$;

-- Restricciones de ejecución (Grants)
REVOKE EXECUTE ON FUNCTION public.change_associate_membership_plan(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_associate_membership_plan(UUID, UUID, TEXT) TO service_role, authenticated;

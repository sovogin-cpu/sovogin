-- Migration Down: 20260821_portal_phase4a2_membership_plan_management_down.sql
-- Description: Rollback de la RPC de Cambio Atómico de Plan (Fase 4A2)

REVOKE EXECUTE ON FUNCTION public.change_associate_membership_plan(UUID, UUID, TEXT) FROM service_role, authenticated;
DROP FUNCTION IF EXISTS public.change_associate_membership_plan(UUID, UUID, TEXT);

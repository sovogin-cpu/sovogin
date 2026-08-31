-- Migration Down: 20260822_portal_phase4a2_financial_mutations_down.sql
-- Description: Rollback de las RPCs de mutaciones financieras (Fase 4A2 Parte 2B)

REVOKE EXECUTE ON FUNCTION public.create_membership_charge(UUID, TEXT, NUMERIC, DATE, VARCHAR, UUID, DATE, DATE, VARCHAR, VARCHAR) FROM service_role, authenticated;
DROP FUNCTION IF EXISTS public.create_membership_charge(UUID, TEXT, NUMERIC, DATE, VARCHAR, UUID, DATE, DATE, VARCHAR, VARCHAR);

REVOKE EXECUTE ON FUNCTION public.register_membership_payment(UUID, NUMERIC, VARCHAR, TIMESTAMPTZ, VARCHAR, TEXT, UUID) FROM service_role, authenticated;
DROP FUNCTION IF EXISTS public.register_membership_payment(UUID, NUMERIC, VARCHAR, TIMESTAMPTZ, VARCHAR, TEXT, UUID);

REVOKE EXECUTE ON FUNCTION public.create_membership_adjustment(UUID, VARCHAR, NUMERIC, TEXT) FROM service_role, authenticated;
DROP FUNCTION IF EXISTS public.create_membership_adjustment(UUID, VARCHAR, NUMERIC, TEXT);

REVOKE EXECUTE ON FUNCTION public.reverse_membership_adjustment(UUID, TEXT) FROM service_role, authenticated;
DROP FUNCTION IF EXISTS public.reverse_membership_adjustment(UUID, TEXT);

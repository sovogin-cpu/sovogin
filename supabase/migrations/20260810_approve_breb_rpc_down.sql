-- Rollback: Reversión de Funciones RPC para Conciliación Bre-B (SOVOGIN)

DROP FUNCTION IF EXISTS public.approve_breb_payment_order(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_breb_payment_order(UUID, UUID, TEXT);

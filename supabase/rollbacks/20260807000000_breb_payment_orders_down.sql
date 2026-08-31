-- Migración Down (Rollback): Integración Bre-B en payment_orders (SOVOGIN)
-- Descripción: Reversión limpia de campos Bre-B, políticas e índices preservando transacciones de Openpay.

-- 1. Eliminar políticas RLS administrativas agregadas
DROP POLICY IF EXISTS "Admins can update payment_orders" ON public.payment_orders;

-- 2. Eliminar índices
DROP INDEX IF EXISTS public.idx_payment_orders_breb_ref;
DROP INDEX IF EXISTS public.idx_payment_orders_method_status;

-- 3. Eliminar columnas creadas para Bre-B (sin CASCADE)
ALTER TABLE public.payment_orders DROP COLUMN IF EXISTS breb_rejection_reason;
ALTER TABLE public.payment_orders DROP COLUMN IF EXISTS breb_verified_by;
ALTER TABLE public.payment_orders DROP COLUMN IF EXISTS breb_verified_at;
ALTER TABLE public.payment_orders DROP COLUMN IF EXISTS breb_reported_at;
ALTER TABLE public.payment_orders DROP COLUMN IF EXISTS breb_transaction_reference;

-- 4. Restaurar la restricción CHECK original de status en payment_orders
ALTER TABLE public.payment_orders DROP CONSTRAINT IF EXISTS payment_orders_status_check;

ALTER TABLE public.payment_orders 
ADD CONSTRAINT payment_orders_status_check 
CHECK (
  status IN (
    'pending',
    'processing',
    'paid',
    'failed',
    'cancelled',
    'expired',
    'refunded'
  )
);

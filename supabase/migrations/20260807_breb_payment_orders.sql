-- Migración: Preparación de Órdenes de Pago para Integración Bre-B (SOVOGIN)
-- Descripción: Amplía la restricción de estados en payment_orders, agrega campos de conciliación y políticas RLS administrativas.

-- 1. Actualización retrocompatible de la restricción CHECK para payment_orders.status
ALTER TABLE public.payment_orders DROP CONSTRAINT IF EXISTS payment_orders_status_check;

ALTER TABLE public.payment_orders 
ADD CONSTRAINT payment_orders_status_check 
CHECK (
  status IN (
    'pending',
    'processing',
    'pending_verification',
    'paid',
    'failed',
    'cancelled',
    'expired',
    'refunded'
  )
);

-- 2. Agregar campos específicos para conciliación de transferencias Bre-B (Banco de Bogotá MID)
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS breb_transaction_reference TEXT NULL;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS breb_reported_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS breb_verified_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS breb_verified_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS breb_rejection_reason TEXT NULL;

-- 3. Índices de optimización para búsqueda y filtrado de conciliaciones
CREATE INDEX IF NOT EXISTS idx_payment_orders_method_status 
ON public.payment_orders (payment_method, status);

CREATE INDEX IF NOT EXISTS idx_payment_orders_breb_ref 
ON public.payment_orders (breb_transaction_reference);

-- 4. Política RLS de actualización administrativa para conciliación de pagos
DROP POLICY IF EXISTS "Admins can update payment_orders" ON public.payment_orders;

CREATE POLICY "Admins can update payment_orders" 
ON public.payment_orders 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
  )
);

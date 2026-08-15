-- Rollback: Reversión de categoría y modalidad en payment_orders (SOVOGIN)

ALTER TABLE public.payment_orders 
DROP CONSTRAINT IF EXISTS payment_orders_modality_check;

ALTER TABLE public.payment_orders 
DROP COLUMN IF EXISTS modality;

ALTER TABLE public.payment_orders 
DROP COLUMN IF EXISTS category;

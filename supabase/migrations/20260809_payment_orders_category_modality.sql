-- Migración: Persistencia de categoría y modalidad en payment_orders (SOVOGIN)
-- Descripción: Agrega las columnas category y modality a public.payment_orders con restricción CHECK para modality.

-- 1. Agregar columna category (dinámica por evento)
ALTER TABLE public.payment_orders 
ADD COLUMN IF NOT EXISTS category TEXT NULL;

-- 2. Agregar columna modality
ALTER TABLE public.payment_orders 
ADD COLUMN IF NOT EXISTS modality TEXT NULL;

-- 3. Restricción CHECK para modality (valores válidos: 'presencial', 'virtual')
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payment_orders_modality_check'
    ) THEN
        ALTER TABLE public.payment_orders 
        ADD CONSTRAINT payment_orders_modality_check 
        CHECK (modality IS NULL OR modality IN ('presencial', 'virtual'));
    END IF;
END $$;

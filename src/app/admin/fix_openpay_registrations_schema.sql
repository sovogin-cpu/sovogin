-- Migración segura para la integración de inscripciones automáticas con Openpay

-- 1. Actualizaciones para la tabla public.registrations
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS payment_order_id UUID REFERENCES public.payment_orders(id);
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS openpay_transaction_id TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS authorization_code TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS customer_document_type TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'openpay';

-- Restricciones de unicidad para garantizar la idempotencia
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'registrations_payment_order_id_key'
    ) THEN
        ALTER TABLE public.registrations ADD CONSTRAINT registrations_payment_order_id_key UNIQUE (payment_order_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'registrations_payment_reference_key'
    ) THEN
        ALTER TABLE public.registrations ADD CONSTRAINT registrations_payment_reference_key UNIQUE (payment_reference);
    END IF;
END $$;

-- 2. Actualizaciones para la tabla public.payment_orders
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS registration_id UUID REFERENCES public.registrations(id);
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS registration_created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS confirmation_email_error TEXT;

-- Migration: 20260831120000_portal_phase4a5_2_collections.sql
-- Description: Módulo de Cartera y Cobranza - Bitácora de Gestiones Append-Only & Anti-Spoofing (Fase 4A5.2-A.H1)

CREATE TABLE IF NOT EXISTS public.collection_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    associate_id UUID NOT NULL REFERENCES public.associates(id) ON DELETE RESTRICT,
    performed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'phone', 'whatsapp', 'in_person', 'other', 'system')),
    action_type VARCHAR(30) NOT NULL CHECK (action_type IN ('initial_reminder', 'payment_notice', 'follow_up', 'payment_promise', 'dispute', 'escalation', 'note')),
    result_status VARCHAR(30) NOT NULL CHECK (result_status IN ('contacted', 'no_answer', 'promise_agreed', 'disputed', 'pending')),
    notes TEXT NULL,
    promised_payment_date DATE NULL,
    promised_payment_amount NUMERIC(14,2) NULL CHECK (promised_payment_amount >= 0),
    next_follow_up_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ÍNDICES DE OPTIMIZACIÓN
CREATE INDEX IF NOT EXISTS idx_collection_actions_associate_created
ON public.collection_actions (associate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collection_actions_next_follow_up
ON public.collection_actions (next_follow_up_at)
WHERE next_follow_up_at IS NOT NULL;

-- SEGURIDAD ESTRUCTURAL, PRIVILEGIOS & RLS APPEND-ONLY
ALTER TABLE public.collection_actions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.collection_actions FROM PUBLIC, anon;
REVOKE UPDATE, DELETE ON public.collection_actions FROM authenticated;
GRANT SELECT, INSERT ON public.collection_actions TO authenticated, service_role;

-- POLÍTICA SELECT: Solo administradores autenticados pueden consultar las gestiones
CREATE POLICY "Admins can select collection actions"
ON public.collection_actions FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- POLÍTICA INSERT APPEND-ONLY & ANTI-SPOOFING:
-- Exige rol admin Y asignación estricta performed_by = auth.uid()
CREATE POLICY "Admins can insert own collection actions"
ON public.collection_actions FOR INSERT TO authenticated
WITH CHECK (
    performed_by = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

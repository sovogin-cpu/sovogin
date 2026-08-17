-- Migration: 20260818_portal_phase3_benefits.sql
-- Description: Endurecimiento RLS de commercial_benefits, creación de commercial_benefit_private_details y bucket privado member-resources (Portal Fase 3A)
-- IMPORTANT: No modifica esquema de public.commercial_benefits ni endpoints públicos.

-- 1. ENDURECIMIENTO DE SEGURIDAD EN public.commercial_benefits
-- Eliminar la política histórica temporal e insegura que permitía ALL a cualquier usuario authenticated
DROP POLICY IF EXISTS "Permitir administracion temporal a usuarios autenticados" ON public.commercial_benefits;

-- Crear la política administrativa real restringida a administradores (profiles.role = 'admin')
DROP POLICY IF EXISTS "Administradores gestionan beneficios comerciales" ON public.commercial_benefits;
CREATE POLICY "Administradores gestionan beneficios comerciales"
    ON public.commercial_benefits
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    );

-- 2. CREACIÓN DE LA TABLA PRIVADA DE DETALLES DE CONVENIOS (DISEÑO B)
CREATE TABLE IF NOT EXISTS public.commercial_benefit_private_details (
    benefit_id UUID PRIMARY KEY REFERENCES public.commercial_benefits(id) ON DELETE CASCADE,
    discount_code VARCHAR(100) DEFAULT NULL,
    redemption_instructions TEXT DEFAULT NULL,
    exclusive_link_url VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para updated_at en commercial_benefit_private_details
DROP TRIGGER IF EXISTS trg_commercial_benefit_private_details_updated_at ON public.commercial_benefit_private_details;
CREATE TRIGGER trg_commercial_benefit_private_details_updated_at
    BEFORE UPDATE ON public.commercial_benefit_private_details
    FOR EACH ROW
    EXECUTE FUNCTION public.set_commercial_benefits_updated_at();

-- Habilitar RLS en la tabla privada (Invisible para anon y usuarios asociados comunes por PostgREST)
ALTER TABLE public.commercial_benefit_private_details ENABLE ROW LEVEL SECURITY;

-- Política de gestión exclusiva para administradores verificados en profiles
DROP POLICY IF EXISTS "Permitir administracion a usuarios admin" ON public.commercial_benefit_private_details;
CREATE POLICY "Permitir administracion a usuarios admin"
    ON public.commercial_benefit_private_details
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    );

-- 3. CREACIÓN Y CONFIGURACIÓN DEL BUCKET PRIVADO 'member-resources' EN STORAGE
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-resources', 'member-resources', false)
ON CONFLICT (id)
DO UPDATE SET
    name = EXCLUDED.name,
    public = false;

-- Política de Storage para el bucket privado member-resources (Acceso exclusivo admin)
DROP POLICY IF EXISTS "Administradores gestionan member-resources" ON storage.objects;
CREATE POLICY "Administradores gestionan member-resources"
    ON storage.objects FOR ALL
    TO authenticated
    USING (
        bucket_id = 'member-resources' AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        bucket_id = 'member-resources' AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

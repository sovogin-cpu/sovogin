-- Migration: 20260819_portal_phase3b_resources_visibility.sql
-- Description: Adición de columna visibility y endurecimiento RLS en public.resources (Portal Fase 3B)
-- IMPORTANT: No modifica registros existentes destructivamente (default 'public').

-- 1. ADICIÓN DE COLUMNA VISIBILITY Y CONSTRAINT
ALTER TABLE public.resources
ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public' NOT NULL;

-- Restricción de valores permitidos
ALTER TABLE public.resources
DROP CONSTRAINT IF EXISTS chk_resources_visibility;

ALTER TABLE public.resources
ADD CONSTRAINT chk_resources_visibility CHECK (visibility IN ('public', 'members_only'));

-- 2. HABILITAR RLS EN public.resources
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- 3. LIMPIEZA DE LAS 8 POLÍTICAS HISTÓRICAS REALES DETECTADAS EN PRODUCCIÓN
DROP POLICY IF EXISTS "Admin recursos" ON public.resources;
DROP POLICY IF EXISTS "Full access" ON public.resources;
DROP POLICY IF EXISTS "Lectura pública recursos" ON public.resources;
DROP POLICY IF EXISTS "Permitir borrar recursos" ON public.resources;
DROP POLICY IF EXISTS "Permitir editar recursos" ON public.resources;
DROP POLICY IF EXISTS "Permitir insertar recursos" ON public.resources;
DROP POLICY IF EXISTS "Permitir ver recursos a todos" ON public.resources;
DROP POLICY IF EXISTS "Public view" ON public.resources;

-- Limpieza de variantes legacy adicionales si existieran
DROP POLICY IF EXISTS "Lectura pública de recursos" ON public.resources;
DROP POLICY IF EXISTS "Allow public select on resources" ON public.resources;
DROP POLICY IF EXISTS "Gestión total de recursos para autenticados" ON public.resources;
DROP POLICY IF EXISTS "Lectura publica de recursos" ON public.resources;
DROP POLICY IF EXISTS "Administradores gestionan recursos" ON public.resources;

-- 4. NUEVAS POLÍTICAS DE SEGURIDAD ESTRICTAS PARA FASE 3B

-- A. Lectura pública únicamente de recursos con visibility = 'public'
CREATE POLICY "Lectura publica de recursos"
    ON public.resources FOR SELECT
    TO public
    USING (visibility = 'public');

-- B. Gestión total exclusiva para administradores verificados en profiles (role = 'admin')
CREATE POLICY "Administradores gestionan recursos"
    ON public.resources FOR ALL
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

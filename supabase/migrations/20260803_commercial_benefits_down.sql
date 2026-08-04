-- ==============================================================================
-- ROLLBACK MIGRACIÓN BASE DE DATOS: BENEFICIOS COMERCIALES (COMMERCIAL BENEFITS) - FASE 1
-- Fecha: 3 de agosto de 2026
-- Rama: feature/content-admin-framework
-- Descripción: Reversión segura e idempotente del módulo commercial_benefits.
--              No se utiliza CASCADE y no se modifican otras tablas ni buckets.
-- ==============================================================================

-- 1. ELIMINAR POLÍTICAS DE SEGURIDAD (RLS)
DROP POLICY IF EXISTS "Permitir lectura publica de beneficios comerciales activos y vigentes" ON public.commercial_benefits;
DROP POLICY IF EXISTS "Permitir administracion temporal a usuarios autenticados" ON public.commercial_benefits;

-- 2. ELIMINAR TRIGGER DE UPDATED_AT
DROP TRIGGER IF EXISTS trg_commercial_benefits_updated_at ON public.commercial_benefits;

-- 3. ELIMINAR TABLA PUBLIC.COMMERCIAL_BENEFITS
DROP TABLE IF EXISTS public.commercial_benefits;

-- 4. ELIMINAR FUNCIÓN EXCLUSIVA DE UPDATED_AT
DROP FUNCTION IF EXISTS public.set_commercial_benefits_updated_at();

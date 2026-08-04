-- ==============================================================================
-- MIGRACIÓN BASE DE DATOS: BENEFICIOS COMERCIALES (COMMERCIAL BENEFITS) - FASE 1
-- Fecha: 3 de agosto de 2026
-- Rama: feature/content-admin-framework
-- Descripción: Creación del esquema aditivo para public.commercial_benefits,
--              índices de rendimiento, trigger de actualización, y políticas RLS
--              para despliegue debajo de Patrocinadores y Aliados.
-- ==============================================================================

-- 1. TABLA PUBLIC.COMMERCIAL_BENEFITS
CREATE TABLE IF NOT EXISTS public.commercial_benefits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    benefit_title TEXT NOT NULL,
    short_description TEXT NOT NULL,
    full_description TEXT NULL,
    logo_media_id UUID NULL REFERENCES public.media_items(id) ON DELETE SET NULL,
    promotional_media_id UUID NULL REFERENCES public.media_items(id) ON DELETE SET NULL,
    link_url TEXT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NULL,
    ends_at TIMESTAMP WITH TIME ZONE NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Restricciones (Constraints)
    CONSTRAINT chk_commercial_benefits_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT chk_commercial_benefits_title_not_empty CHECK (length(trim(benefit_title)) > 0),
    CONSTRAINT chk_commercial_benefits_short_desc_not_empty CHECK (length(trim(short_description)) > 0),
    CONSTRAINT chk_commercial_benefits_display_order CHECK (display_order >= 0),
    CONSTRAINT chk_commercial_benefits_valid_dates CHECK (
        (starts_at IS NULL OR ends_at IS NULL) OR (ends_at >= starts_at)
    )
);

-- 2. ÍNDICES DE RENDIMIENTO Y BÚSQUEDA
CREATE INDEX IF NOT EXISTS idx_commercial_benefits_is_active ON public.commercial_benefits(is_active);
CREATE INDEX IF NOT EXISTS idx_commercial_benefits_is_featured ON public.commercial_benefits(is_featured);
CREATE INDEX IF NOT EXISTS idx_commercial_benefits_display_order ON public.commercial_benefits(display_order);
CREATE INDEX IF NOT EXISTS idx_commercial_benefits_starts_at ON public.commercial_benefits(starts_at);
CREATE INDEX IF NOT EXISTS idx_commercial_benefits_ends_at ON public.commercial_benefits(ends_at);
CREATE INDEX IF NOT EXISTS idx_commercial_benefits_created_at ON public.commercial_benefits(created_at);
CREATE INDEX IF NOT EXISTS idx_commercial_benefits_lower_name ON public.commercial_benefits(lower(name));
CREATE INDEX IF NOT EXISTS idx_commercial_benefits_lower_title ON public.commercial_benefits(lower(benefit_title));

-- 3. FUNCIÓN TRIGGER PARA UPDATED_AT (Exclusiva del módulo Commercial Benefits)
CREATE OR REPLACE FUNCTION public.set_commercial_benefits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at en commercial_benefits
DROP TRIGGER IF EXISTS trg_commercial_benefits_updated_at ON public.commercial_benefits;
CREATE TRIGGER trg_commercial_benefits_updated_at
    BEFORE UPDATE ON public.commercial_benefits
    FOR EACH ROW
    EXECUTE FUNCTION public.set_commercial_benefits_updated_at();

-- 4. SEGURIDAD A NIVEL DE FILA (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.commercial_benefits ENABLE ROW LEVEL SECURITY;

-- Limpieza idempotente de políticas
DROP POLICY IF EXISTS "Permitir lectura publica de beneficios comerciales activos y vigentes" ON public.commercial_benefits;
DROP POLICY IF EXISTS "Permitir administracion temporal a usuarios autenticados" ON public.commercial_benefits;

-- Política 1: Lectura Pública Limitada por Vigencia y Estado Activo
CREATE POLICY "Permitir lectura publica de beneficios comerciales activos y vigentes"
    ON public.commercial_benefits
    FOR SELECT
    TO public
    USING (
        is_active = true
        AND (starts_at IS NULL OR starts_at <= timezone('utc'::text, now()))
        AND (ends_at IS NULL OR ends_at >= timezone('utc'::text, now()))
    );

-- Política 2: Administración Temporal para Usuarios Autenticados
-- NOTA: Esta política permite ALL temporalmente a authenticated durante la Fase 1.
-- En la Fase 2 administrativa será reemplazada por validación explícita del rol de administrador (profiles.role = 'admin').
CREATE POLICY "Permitir administracion temporal a usuarios autenticados"
    ON public.commercial_benefits
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- ROLLBACK MIGRACIÓN BASE DE DATOS: CONTENT CMS CORE & DOCTOR DIRECTORY - FASE 1
-- Fecha: 3 de agosto de 2026
-- Rama: feature/content-cms-core
-- Descripción: Reversión limpia e idempotente del esquema Content CMS Core.
-- ==============================================================================

-- 1. ELIMINACIÓN DE POLÍTICAS RLS

-- doctor_directory_profiles
DROP POLICY IF EXISTS "Lectura pública de médicos autorizados" ON public.doctor_directory_profiles;
DROP POLICY IF EXISTS "Gestión total de perfiles de directorio para autenticados" ON public.doctor_directory_profiles;

-- content_post_categories
DROP POLICY IF EXISTS "Lectura pública de categorías asociadas a posts publicados" ON public.content_post_categories;
DROP POLICY IF EXISTS "Gestión total de relaciones post-categoría para autenticados" ON public.content_post_categories;

-- content_categories
DROP POLICY IF EXISTS "Lectura pública de categorías activas" ON public.content_categories;
DROP POLICY IF EXISTS "Gestión total de categorías para usuarios autenticados" ON public.content_categories;

-- content_posts
DROP POLICY IF EXISTS "Lectura pública de artículos publicados" ON public.content_posts;
DROP POLICY IF EXISTS "Gestión total de publicaciones para usuarios autenticados" ON public.content_posts;

-- 2. ELIMINACIÓN DE TRIGGERS
DROP TRIGGER IF EXISTS trg_doctor_directory_updated_at ON public.doctor_directory_profiles;
DROP TRIGGER IF EXISTS trg_content_categories_updated_at ON public.content_categories;
DROP TRIGGER IF EXISTS trg_content_posts_updated_at ON public.content_posts;

-- 3. ELIMINACIÓN DE ÍNDICES ÚNICOS Y TABLAS EN ORDEN SEGURO
DROP INDEX IF EXISTS idx_content_categories_channel_slug;

DROP TABLE IF EXISTS public.doctor_directory_profiles;
DROP TABLE IF EXISTS public.content_post_categories;
DROP TABLE IF EXISTS public.content_categories;
DROP TABLE IF EXISTS public.content_posts;

-- 4. RESTAURACIÓN DE LA RESTRICCIÓN ORIGINAL EN PUBLIC.BANNERS
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'banners'
    ) THEN
        ALTER TABLE public.banners DROP CONSTRAINT IF EXISTS banners_position_check;

        ALTER TABLE public.banners ADD CONSTRAINT banners_position_check CHECK (
            position IN (
                'HOME_HERO',
                'EVENTS_HEADER',
                'RESOURCES_HEADER',
                'ASSOCIATION_HEADER'
            )
        );
    END IF;
END $$;

-- 5. ELIMINACIÓN DE LA FUNCIÓN TRIGGER DEL MÓDULO
DROP FUNCTION IF EXISTS public.set_content_cms_updated_at();

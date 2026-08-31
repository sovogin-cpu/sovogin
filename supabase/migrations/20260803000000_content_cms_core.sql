-- ==============================================================================
-- MIGRACIÓN BASE DE DATOS: CONTENT CMS CORE & DOCTOR DIRECTORY - FASE 1
-- Fecha: 3 de agosto de 2026
-- Rama: feature/content-cms-core
-- Descripción: Creación de esquemas aditivos para public.content_posts,
--              public.content_categories, public.content_post_categories,
--              public.doctor_directory_profiles, índices, triggers,
--              actualización de posiciones de banners y políticas RLS.
-- ==============================================================================

-- 1. FUNCIÓN TRIGGER PARA UPDATED_AT (Exclusiva del módulo Content CMS)
CREATE OR REPLACE FUNCTION public.set_content_cms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TABLA PUBLIC.CONTENT_POSTS
CREATE TABLE IF NOT EXISTS public.content_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    excerpt TEXT,
    content JSONB NOT NULL DEFAULT '[]'::jsonb,
    featured_media_id UUID REFERENCES public.media_items(id) ON DELETE SET NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    visibility TEXT NOT NULL DEFAULT 'public',
    published_at TIMESTAMP WITH TIME ZONE,
    seo_title TEXT,
    seo_description TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Restricciones
    CONSTRAINT chk_content_posts_channel CHECK (channel IN ('innovation', 'community', 'news', 'benefits')),
    CONSTRAINT chk_content_posts_status CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT chk_content_posts_visibility CHECK (visibility IN ('public', 'members_only')),
    CONSTRAINT chk_content_posts_title_trim CHECK (char_length(trim(title)) > 0),
    CONSTRAINT chk_content_posts_slug_trim CHECK (char_length(trim(slug)) > 0),
    CONSTRAINT chk_content_posts_jsonb_array CHECK (jsonb_typeof(content) = 'array'),
    CONSTRAINT uq_content_posts_channel_slug UNIQUE (channel, slug)
);

-- Trigger para updated_at en content_posts
DROP TRIGGER IF EXISTS trg_content_posts_updated_at ON public.content_posts;
CREATE TRIGGER trg_content_posts_updated_at
    BEFORE UPDATE ON public.content_posts
    FOR EACH ROW
    EXECUTE PROCEDURE public.set_content_cms_updated_at();

-- 3. TABLA PUBLIC.CONTENT_CATEGORIES
CREATE TABLE IF NOT EXISTS public.content_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel TEXT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Restricciones
    CONSTRAINT chk_content_categories_channel CHECK (channel IS NULL OR channel IN ('innovation', 'community', 'news', 'benefits')),
    CONSTRAINT chk_content_categories_name_trim CHECK (char_length(trim(name)) > 0),
    CONSTRAINT chk_content_categories_slug_trim CHECK (char_length(trim(slug)) > 0)
);

-- Índice único en content_categories soportando canal nulo (Global)
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_categories_channel_slug 
    ON public.content_categories (COALESCE(channel, '__global__'), slug);

-- Trigger para updated_at en content_categories
DROP TRIGGER IF EXISTS trg_content_categories_updated_at ON public.content_categories;
CREATE TRIGGER trg_content_categories_updated_at
    BEFORE UPDATE ON public.content_categories
    FOR EACH ROW
    EXECUTE PROCEDURE public.set_content_cms_updated_at();

-- 4. TABLA INTERMEDIA PUBLIC.CONTENT_POST_CATEGORIES (N:M)
CREATE TABLE IF NOT EXISTS public.content_post_categories (
    post_id UUID REFERENCES public.content_posts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.content_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    PRIMARY KEY (post_id, category_id)
);

-- 5. TABLA PUBLIC.DOCTOR_DIRECTORY_PROFILES
CREATE TABLE IF NOT EXISTS public.doctor_directory_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    associate_id UUID NOT NULL UNIQUE REFERENCES public.associates(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    specialty TEXT NOT NULL DEFAULT 'Ginecología y Obstetricia',
    subspecialty TEXT,
    city TEXT,
    public_phone TEXT,
    public_email TEXT,
    office_address TEXT,
    profile_media_id UUID REFERENCES public.media_items(id) ON DELETE SET NULL,
    bio TEXT,
    website_url TEXT,
    telemedicine_available BOOLEAN NOT NULL DEFAULT false,
    consent_given_at TIMESTAMP WITH TIME ZONE,
    is_published BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Restricciones
    CONSTRAINT chk_doctor_directory_display_name_trim CHECK (char_length(trim(display_name)) > 0),
    CONSTRAINT chk_doctor_directory_display_order CHECK (display_order >= 0),
    CONSTRAINT chk_doctor_directory_published_consent CHECK (
        (is_published = false) OR (is_published = true AND consent_given_at IS NOT NULL)
    )
);

-- Trigger para updated_at en doctor_directory_profiles
DROP TRIGGER IF EXISTS trg_doctor_directory_updated_at ON public.doctor_directory_profiles;
CREATE TRIGGER trg_doctor_directory_updated_at
    BEFORE UPDATE ON public.doctor_directory_profiles
    FOR EACH ROW
    EXECUTE PROCEDURE public.set_content_cms_updated_at();

-- 6. ÍNDICES DE RENDIMIENTO Y BÚSQUEDA

-- Índices para content_posts
CREATE INDEX IF NOT EXISTS idx_content_posts_channel ON public.content_posts(channel);
CREATE INDEX IF NOT EXISTS idx_content_posts_status ON public.content_posts(status);
CREATE INDEX IF NOT EXISTS idx_content_posts_visibility ON public.content_posts(visibility);
CREATE INDEX IF NOT EXISTS idx_content_posts_published_at ON public.content_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_posts_is_featured ON public.content_posts(is_featured);
CREATE INDEX IF NOT EXISTS idx_content_posts_created_at ON public.content_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_posts_title_lower ON public.content_posts(LOWER(title));
CREATE INDEX IF NOT EXISTS idx_content_posts_featured_media ON public.content_posts(featured_media_id);

-- Índices para content_post_categories
CREATE INDEX IF NOT EXISTS idx_content_post_categories_category ON public.content_post_categories(category_id);

-- Índices para doctor_directory_profiles
CREATE INDEX IF NOT EXISTS idx_doctor_directory_associate_id ON public.doctor_directory_profiles(associate_id);
CREATE INDEX IF NOT EXISTS idx_doctor_directory_is_published ON public.doctor_directory_profiles(is_published);
CREATE INDEX IF NOT EXISTS idx_doctor_directory_city ON public.doctor_directory_profiles(city);
CREATE INDEX IF NOT EXISTS idx_doctor_directory_display_order ON public.doctor_directory_profiles(display_order);

-- 7. ACTUALIZACIÓN SEGURA DE RESTRICCIÓN DE BANNERS
-- Ampliación idempotente de la restricción CHECK de posición en public.banners
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
                'ASSOCIATION_HEADER',
                'INNOVATION_HEADER',
                'INNOVATION_INLINE',
                'COMMUNITY_HEADER',
                'COMMUNITY_INLINE',
                'BENEFITS_HEADER',
                'BENEFITS_INLINE',
                'DIRECTORY_HEADER',
                'DIRECTORY_INLINE'
            )
        );
    END IF;
END $$;

-- 8. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)

-- A. Habilitar RLS en tablas creadas
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_directory_profiles ENABLE ROW LEVEL SECURITY;

-- B. Políticas para public.content_posts
DROP POLICY IF EXISTS "Lectura pública de artículos publicados" ON public.content_posts;
CREATE POLICY "Lectura pública de artículos publicados"
    ON public.content_posts FOR SELECT
    USING (
        status = 'published' 
        AND visibility = 'public'
        AND (published_at IS NULL OR published_at <= timezone('utc'::text, now()))
    );

DROP POLICY IF EXISTS "Gestión total de publicaciones para usuarios autenticados" ON public.content_posts;
CREATE POLICY "Gestión total de publicaciones para usuarios autenticados"
    ON public.content_posts FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- C. Políticas para public.content_categories
DROP POLICY IF EXISTS "Lectura pública de categorías activas" ON public.content_categories;
CREATE POLICY "Lectura pública de categorías activas"
    ON public.content_categories FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Gestión total de categorías para usuarios autenticados" ON public.content_categories;
CREATE POLICY "Gestión total de categorías para usuarios autenticados"
    ON public.content_categories FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- D. Políticas para public.content_post_categories
DROP POLICY IF EXISTS "Lectura pública de categorías asociadas a posts publicados" ON public.content_post_categories;
CREATE POLICY "Lectura pública de categorías asociadas a posts publicados"
    ON public.content_post_categories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.content_posts p
            WHERE p.id = post_id
              AND p.status = 'published'
              AND p.visibility = 'public'
              AND (p.published_at IS NULL OR p.published_at <= timezone('utc'::text, now()))
        )
    );

DROP POLICY IF EXISTS "Gestión total de relaciones post-categoría para autenticados" ON public.content_post_categories;
CREATE POLICY "Gestión total de relaciones post-categoría para autenticados"
    ON public.content_post_categories FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- E. Políticas para public.doctor_directory_profiles
DROP POLICY IF EXISTS "Lectura pública de médicos autorizados" ON public.doctor_directory_profiles;
CREATE POLICY "Lectura pública de médicos autorizados"
    ON public.doctor_directory_profiles FOR SELECT
    USING (
        is_published = true 
        AND consent_given_at IS NOT NULL
    );

DROP POLICY IF EXISTS "Gestión total de perfiles de directorio para autenticados" ON public.doctor_directory_profiles;
CREATE POLICY "Gestión total de perfiles de directorio para autenticados"
    ON public.doctor_directory_profiles FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

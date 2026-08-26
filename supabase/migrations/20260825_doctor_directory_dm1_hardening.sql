-- Migration: 20260825_doctor_directory_dm1_hardening.sql
-- Description: Fase DM1 - Data Model Hardening para el Directorio MÃ©dico (slug, country, department, clinic_name, whatsapp_phone, social_links, is_verified)

-- 1. AGREGAR NUEVAS COLUMNAS AL MODELO DOCTOR_DIRECTORY_PROFILES (BACKWARD-COMPATIBLE)
ALTER TABLE public.doctor_directory_profiles
    ADD COLUMN IF NOT EXISTS slug TEXT,
    ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'Colombia',
    ADD COLUMN IF NOT EXISTS department TEXT NULL,
    ADD COLUMN IF NOT EXISTS clinic_name TEXT NULL,
    ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT NULL,
    ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- 2. RESTRICCIÃ“N DE INTEGRIDAD PARA SOCIAL_LINKS (SOLO OBJETOS JSONB)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_doctor_directory_social_links_object'
    ) THEN
        ALTER TABLE public.doctor_directory_profiles
            ADD CONSTRAINT chk_doctor_directory_social_links_object
            CHECK (jsonb_typeof(social_links) = 'object');
    END IF;
END;
$$;

-- 3. FUNCIÃ“N AUXILIAR PARA GENERAR SLUGS LIMPIOS Y SEGUROS PARA URLS
CREATE OR REPLACE FUNCTION public.slugify_doctor_name(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_slug TEXT;
BEGIN
    v_slug := lower(trim(COALESCE(p_name, 'mÃ©dico')));
    -- Reemplazo de caracteres acentuados comunes en espaÃ±ol
    v_slug := translate(v_slug, 'Ã¡Ã Ã¤Ã¢Ã£Ã©Ã¨Ã«ÃªÃ­Ã¬Ã¯Ã®Ã³Ã²Ã¶Ã´ÃµÃºÃ¹Ã¼Ã»Ã±Ã§', 'aaaaaeeeeiiiiooooouuuunc');
    -- Reemplazar cualquier secuencia no alfanumÃ©rica por un guiÃ³n Ãºnico
    v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
    -- Eliminar guiones al inicio o al final
    v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');

    IF v_slug = '' OR v_slug IS NULL THEN
        v_slug := 'doctor';
    END IF;

    RETURN v_slug;
END;
$$;

-- 4. BACKFILL IDEMPOTENTE DE SLUGS PARA REGISTROS EXISTENTES O NUEVOS SIN SLUG
DO $$
DECLARE
    r RECORD;
    v_base_slug TEXT;
    v_slug TEXT;
    v_counter INT;
BEGIN
    FOR r IN SELECT id, display_name FROM public.doctor_directory_profiles WHERE slug IS NULL OR trim(slug) = '' LOOP
        v_base_slug := public.slugify_doctor_name(r.display_name);
        v_slug := v_base_slug;
        v_counter := 1;

        WHILE EXISTS (SELECT 1 FROM public.doctor_directory_profiles WHERE slug = v_slug AND id <> r.id) LOOP
            v_counter := v_counter + 1;
            v_slug := v_base_slug || '-' || v_counter;
        END LOOP;

        UPDATE public.doctor_directory_profiles SET slug = v_slug WHERE id = r.id;
    END LOOP;
END;
$$;

-- 5. RESTRICCIÃ“N NOT NULL IDEMPOTENTE PARA COLUMNA SLUG TRAS COMPLETAR BACKFILL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'doctor_directory_profiles' AND column_name = 'slug' AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE public.doctor_directory_profiles ALTER COLUMN slug SET NOT NULL;
    END IF;
END;
$$;

-- 6. ÃNDICE ÃšNICO PARA SLUG E ÃNDICE DE UBICACIÃ“N COMPUESTA
CREATE UNIQUE INDEX IF NOT EXISTS idx_doctor_directory_profiles_slug
    ON public.doctor_directory_profiles (slug);

CREATE INDEX IF NOT EXISTS idx_doctor_directory_location
    ON public.doctor_directory_profiles (is_published, country, department, city);

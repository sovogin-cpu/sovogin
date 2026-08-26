-- Rollback: 20260825_doctor_directory_dm1_hardening_down.sql
-- Description: Rollback de la fase DM1 (Data Model Hardening) del directorio médico

-- 1. ELIMINAR ÍNDICES
DROP INDEX IF EXISTS public.idx_doctor_directory_location;
DROP INDEX IF EXISTS public.idx_doctor_directory_profiles_slug;

-- 2. ELIMINAR RESTRICCIONES CHECK AGREGADAS
ALTER TABLE public.doctor_directory_profiles
    DROP CONSTRAINT IF EXISTS chk_doctor_directory_social_links_object;

-- 3. ELIMINAR FUNCIÓN AUXILIAR DE SLUG
DROP FUNCTION IF EXISTS public.slugify_doctor_name(TEXT);

-- 4. ELIMINAR COLUMNAS AGREGADAS EN DM1
ALTER TABLE public.doctor_directory_profiles
    DROP COLUMN IF EXISTS is_verified,
    DROP COLUMN IF EXISTS social_links,
    DROP COLUMN IF EXISTS whatsapp_phone,
    DROP COLUMN IF EXISTS clinic_name,
    DROP COLUMN IF EXISTS department,
    DROP COLUMN IF EXISTS country,
    DROP COLUMN IF EXISTS slug;

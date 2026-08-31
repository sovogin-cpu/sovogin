-- Rollback de migración: 20260817_portal_profile_rls.sql

-- 1. Eliminar políticas creadas por la migración
DROP POLICY IF EXISTS "Administradores poseen gestion total de directorio" ON public.doctor_directory_profiles;
DROP POLICY IF EXISTS "Asociados pueden actualizar su propio perfil de directorio" ON public.doctor_directory_profiles;
DROP POLICY IF EXISTS "Asociados pueden crear su propio perfil de directorio" ON public.doctor_directory_profiles;
DROP POLICY IF EXISTS "Asociados pueden ver su propio perfil de directorio" ON public.doctor_directory_profiles;
DROP POLICY IF EXISTS "Lectura pública de médicos autorizados" ON public.doctor_directory_profiles;

-- 2. Eliminar función auxiliar de forma segura (sin CASCADE)
DROP FUNCTION IF EXISTS public.is_associate_active(UUID);

-- 3. Restaurar únicamente las políticas históricas que existían antes de la Fase 2
CREATE POLICY "Lectura pública de médicos autorizados"
    ON public.doctor_directory_profiles FOR SELECT
    USING (
        is_published = true 
        AND consent_given_at IS NOT NULL
    );

CREATE POLICY "Gestión total de perfiles de directorio para autenticados"
    ON public.doctor_directory_profiles FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Migración: Políticas RLS para el Portal del Asociado - Autogestión del Directorio Médico (SOVOGIN - Fase 2)
-- Descripción: Elimina políticas dev permisivas, crea helper SECURITY DEFINER para verificación de estado activo y aplica restricción RLS estricta para lectura, inserción y edición de doctor_directory_profiles.

-- 1. Eliminar políticas dev y públicas anteriores
DROP POLICY IF EXISTS "Gestión total de perfiles de directorio para autenticados" ON public.doctor_directory_profiles;
DROP POLICY IF EXISTS "Lectura pública de médicos autorizados" ON public.doctor_directory_profiles;

-- 2. Crear función auxiliar SECURITY DEFINER para verificar si un asociado se encuentra activo
CREATE OR REPLACE FUNCTION public.is_associate_active(
    p_associate_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.associates a
        WHERE a.id = p_associate_id
          AND a.status = 'Activo'
    );
$$;

-- 3. Configurar permisos estrictos de ejecución sobre la función auxiliar
REVOKE ALL ON FUNCTION public.is_associate_active(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_associate_active(UUID) TO anon, authenticated, service_role;

-- 4. Política RLS: Lectura pública de médicos autorizados y asociados activos
CREATE POLICY "Lectura pública de médicos autorizados"
    ON public.doctor_directory_profiles FOR SELECT
    USING (
        is_published = true 
        AND consent_given_at IS NOT NULL
        AND public.is_associate_active(associate_id)
    );

-- 5. Política RLS: El asociado activo puede ver su propio perfil de directorio (incluso borrador)
DROP POLICY IF EXISTS "Asociados pueden ver su propio perfil de directorio" ON public.doctor_directory_profiles;
CREATE POLICY "Asociados pueden ver su propio perfil de directorio"
    ON public.doctor_directory_profiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.associates a
            WHERE a.id = doctor_directory_profiles.associate_id
              AND a.user_id = auth.uid()
              AND a.status = 'Activo'
        )
    );

-- 6. Política RLS: El asociado activo puede crear su propio perfil de directorio
DROP POLICY IF EXISTS "Asociados pueden crear su propio perfil de directorio" ON public.doctor_directory_profiles;
CREATE POLICY "Asociados pueden crear su propio perfil de directorio"
    ON public.doctor_directory_profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.associates a
            WHERE a.id = doctor_directory_profiles.associate_id
              AND a.user_id = auth.uid()
              AND a.status = 'Activo'
        )
    );

-- 7. Política RLS: El asociado activo puede actualizar su propio perfil de directorio
DROP POLICY IF EXISTS "Asociados pueden actualizar su propio perfil de directorio" ON public.doctor_directory_profiles;
CREATE POLICY "Asociados pueden actualizar su propio perfil de directorio"
    ON public.doctor_directory_profiles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.associates a
            WHERE a.id = doctor_directory_profiles.associate_id
              AND a.user_id = auth.uid()
              AND a.status = 'Activo'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.associates a
            WHERE a.id = doctor_directory_profiles.associate_id
              AND a.user_id = auth.uid()
              AND a.status = 'Activo'
        )
    );

-- 8. Política RLS: Administradores conservan gestión total
DROP POLICY IF EXISTS "Administradores poseen gestion total de directorio" ON public.doctor_directory_profiles;
CREATE POLICY "Administradores poseen gestion total de directorio"
    ON public.doctor_directory_profiles FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
    );

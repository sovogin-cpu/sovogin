-- Rollback Migration: 20260818_portal_phase3_benefits_down.sql
-- Description: Reversión limpia e idempotente de la migración Portal Fase 3A

-- 1. Restaurar política histórica en commercial_benefits
DROP POLICY IF EXISTS "Administradores gestionan beneficios comerciales" ON public.commercial_benefits;
DROP POLICY IF EXISTS "Permitir administracion temporal a usuarios autenticados" ON public.commercial_benefits;
CREATE POLICY "Permitir administracion temporal a usuarios autenticados"
    ON public.commercial_benefits
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Eliminar la tabla privada de convenios
DROP TRIGGER IF EXISTS trg_commercial_benefit_private_details_updated_at ON public.commercial_benefit_private_details;
DROP POLICY IF EXISTS "Permitir administracion a usuarios admin" ON public.commercial_benefit_private_details;
DROP TABLE IF EXISTS public.commercial_benefit_private_details;

-- 3. Revertir almacenamiento de member-resources
DROP POLICY IF EXISTS "Administradores gestionan member-resources" ON storage.objects;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.objects WHERE bucket_id = 'member-resources'
    ) THEN
        DELETE FROM storage.buckets WHERE id = 'member-resources';
    ELSE
        RAISE NOTICE 'El bucket member-resources contiene archivos y ha sido preservado.';
    END IF;
END $$;

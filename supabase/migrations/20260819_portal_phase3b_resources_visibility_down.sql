-- Rollback Migration: 20260819_portal_phase3b_resources_visibility_down.sql
-- Description: Reversión limpia que restaura EXACTAMENTE las 8 políticas históricas reales de producción pre-3B

-- 1. Eliminar políticas nuevas creadas en Fase 3B
DROP POLICY IF EXISTS "Lectura publica de recursos" ON public.resources;
DROP POLICY IF EXISTS "Administradores gestionan recursos" ON public.resources;

-- 2. Restaurar EXACTAMENTE las 8 políticas reales de producción pre-3B
CREATE POLICY "Admin recursos"
    ON public.resources FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Full access"
    ON public.resources FOR ALL
    TO public
    USING (true);

CREATE POLICY "Lectura pública recursos"
    ON public.resources FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Permitir borrar recursos"
    ON public.resources FOR DELETE
    TO public
    USING (true);

CREATE POLICY "Permitir editar recursos"
    ON public.resources FOR UPDATE
    TO public
    USING (true);

CREATE POLICY "Permitir insertar recursos"
    ON public.resources FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Permitir ver recursos a todos"
    ON public.resources FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Public view"
    ON public.resources FOR SELECT
    TO public
    USING (true);

-- 3. Eliminar constraint y columna visibility
ALTER TABLE public.resources
DROP CONSTRAINT IF EXISTS chk_resources_visibility;

ALTER TABLE public.resources
DROP COLUMN IF EXISTS visibility;

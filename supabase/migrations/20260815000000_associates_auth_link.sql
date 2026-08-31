-- Migración: Vinculación de Cuentas de Autenticación con Asociados (SOVOGIN - Fase 1 Portal)
-- Descripción: Agrega la columna user_id a public.associates para vincular con auth.users y define la política RLS de lectura propia.

-- 1. Agregar columna user_id con restricción UNIQUE y FK hacia auth.users
ALTER TABLE public.associates 
ADD COLUMN IF NOT EXISTS user_id UUID NULL UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Habilitar RLS en public.associates (asegurar)
ALTER TABLE public.associates ENABLE ROW LEVEL SECURITY;

-- 3. Política RLS: Permitir que un asociado autenticado lea únicamente su propio registro de membresía
DROP POLICY IF EXISTS "Associates can view own record." ON public.associates;

CREATE POLICY "Associates can view own record." 
ON public.associates 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

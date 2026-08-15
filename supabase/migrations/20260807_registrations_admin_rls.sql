-- Migración: Políticas RLS para Administración de Inscritos y Perfiles (SOVOGIN)
-- Descripción: Registra y consolida las políticas de seguridad validadas para consulta de perfiles y edición administrativa de inscripciones.

-- 1. Política RLS sobre public.profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (id = auth.uid());

-- 2. Política RLS sobre public.registrations para actualización administrativa
DROP POLICY IF EXISTS "Admins can update registrations" ON public.registrations;

CREATE POLICY "Admins can update registrations" 
ON public.registrations 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
  )
);

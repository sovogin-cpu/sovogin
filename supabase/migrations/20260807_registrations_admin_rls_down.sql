-- Migración Down (Rollback): Políticas RLS para Administración de Inscritos (SOVOGIN)
-- Descripción: Elimina únicamente las políticas agregadas en la migración RLS de inscritos sin alterar tablas.

DROP POLICY IF EXISTS "Admins can update registrations" ON public.registrations;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

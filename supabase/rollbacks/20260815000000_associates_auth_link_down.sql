-- Rollback: Reversión de Vinculación user_id en public.associates (SOVOGIN - Fase 1 Portal)

DROP POLICY IF EXISTS "Associates can view own record." ON public.associates;

ALTER TABLE public.associates DROP CONSTRAINT IF EXISTS associates_user_id_fkey;
ALTER TABLE public.associates DROP CONSTRAINT IF EXISTS associates_user_id_key;
ALTER TABLE public.associates DROP COLUMN IF EXISTS user_id;

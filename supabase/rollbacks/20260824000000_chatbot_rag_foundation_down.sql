-- Rollback: 20260824_chatbot_rag_foundation_down.sql
-- Description: Rollback de la fundación RAG del chatbot (Ubicado en supabase/rollbacks/ fuera del directorio de migraciones)

-- 1. ELIMINAR POLÍTICAS DE STORAGE Y BUCKET
DROP POLICY IF EXISTS "Admins can delete chatbot-docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update chatbot-docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can insert chatbot-docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can select chatbot-docs" ON storage.objects;

DELETE FROM storage.buckets WHERE id = 'chatbot-docs';

-- 2. ELIMINAR POLÍTICAS RLS DE TABLAS
DROP POLICY IF EXISTS "Admins can manage chatbot_document_chunks" ON public.chatbot_document_chunks;
DROP POLICY IF EXISTS "Admins can manage chatbot_documents" ON public.chatbot_documents;

-- 3. ELIMINAR RPC DE BÚSQUEDA VECTORIAL
REVOKE EXECUTE ON FUNCTION public.match_chatbot_document_chunks(vector(768), float, int) FROM service_role, authenticated, PUBLIC, anon;
DROP FUNCTION IF EXISTS public.match_chatbot_document_chunks(vector(768), float, int);

-- 4. ELIMINAR TABLAS, ÍNDICES Y TRIGGERS (CASCADA)
DROP TABLE IF EXISTS public.chatbot_document_chunks CASCADE;

DROP TRIGGER IF EXISTS trg_chatbot_documents_updated_at ON public.chatbot_documents;
DROP FUNCTION IF EXISTS public.update_chatbot_documents_updated_at();
DROP TABLE IF EXISTS public.chatbot_documents CASCADE;

-- 5. NOTA SOBRE PGVECTOR EXTENSION:
-- No ejecutamos DROP EXTENSION vector; para evitar afectar otros módulos si en el futuro la reutilizan.

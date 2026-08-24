-- Migration: 20260824_chatbot_rag_foundation.sql
-- Description: Fundación RAG para Chatbot: pgvector, chatbot_documents, chatbot_document_chunks, índices, RLS, RPC match_chatbot_document_chunks y Bucket Privado chatbot-docs

-- 1. EXTENSIÓN PGVECTOR
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. TABLA PUBLIC.CHATBOT_DOCUMENTS
CREATE TABLE IF NOT EXISTS public.chatbot_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    file_type TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    category TEXT NULL,
    description TEXT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'ready', 'failed')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    chunk_count INTEGER NOT NULL DEFAULT 0 CHECK (chunk_count >= 0),
    processing_error TEXT NULL,
    created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger de updated_at para chatbot_documents
CREATE OR REPLACE FUNCTION public.update_chatbot_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chatbot_documents_updated_at ON public.chatbot_documents;
CREATE TRIGGER trg_chatbot_documents_updated_at
    BEFORE UPDATE ON public.chatbot_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_chatbot_documents_updated_at();

-- 3. TABLA PUBLIC.CHATBOT_DOCUMENT_CHUNKS
CREATE TABLE IF NOT EXISTS public.chatbot_document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.chatbot_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
    content TEXT NOT NULL CHECK (length(trim(content)) > 0),
    token_count INTEGER NULL CHECK (token_count IS NULL OR token_count >= 0),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(768) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chatbot_document_chunks_doc_chunk_uniq UNIQUE (document_id, chunk_index)
);

-- 4. ÍNDICES DE RENDIMIENTO Y BÚSQUEDA VECTORIAL
CREATE INDEX IF NOT EXISTS idx_chatbot_documents_created_at
    ON public.chatbot_documents (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chatbot_documents_active_status
    ON public.chatbot_documents (is_active, status);

CREATE INDEX IF NOT EXISTS idx_chatbot_document_chunks_document_id
    ON public.chatbot_document_chunks (document_id);

-- Índice HNSW con vector_cosine_ops (óptimo para embeddings vector(768) de gemini-embedding-2 / output_dimensionality = 768)
CREATE INDEX IF NOT EXISTS idx_chatbot_document_chunks_embedding_hnsw
    ON public.chatbot_document_chunks
    USING hnsw (embedding vector_cosine_ops);

-- 5. RPC DE BÚSQUEDA VECTORIAL SEGURA
CREATE OR REPLACE FUNCTION public.match_chatbot_document_chunks(
    query_embedding vector(768),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    content TEXT,
    metadata JSONB,
    similarity float,
    document_name TEXT,
    category TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_effective_count INT;
BEGIN
    -- Límite defensivo de resultados entre 1 y 20
    v_effective_count := LEAST(GREATEST(COALESCE(match_count, 5), 1), 20);

    RETURN QUERY
    SELECT
        c.id AS chunk_id,
        c.document_id,
        c.content,
        c.metadata,
        (1 - (c.embedding <=> query_embedding))::float AS similarity,
        d.name AS document_name,
        d.category
    FROM public.chatbot_document_chunks c
    INNER JOIN public.chatbot_documents d ON d.id = c.document_id
    WHERE d.is_active = true
      AND d.status = 'ready'
      AND c.embedding IS NOT NULL
      AND (1 - (c.embedding <=> query_embedding)) >= match_threshold
    ORDER BY c.embedding <=> query_embedding ASC
    LIMIT v_effective_count;
END;
$$;

-- Control estricto de permisos de ejecución: ÚNICAMENTE service_role (acceso server-side de la API)
REVOKE EXECUTE ON FUNCTION public.match_chatbot_document_chunks(vector(768), float, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_chatbot_document_chunks(vector(768), float, int) TO service_role;

-- 6. ROW LEVEL SECURITY (RLS) PARA TABLAS DE CONOCIMIENTO DOCUMENTAL
ALTER TABLE public.chatbot_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_document_chunks ENABLE ROW LEVEL SECURITY;

-- Políticas chatbot_documents (Solo administradores)
DROP POLICY IF EXISTS "Admins can manage chatbot_documents" ON public.chatbot_documents;
CREATE POLICY "Admins can manage chatbot_documents" ON public.chatbot_documents
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Políticas chatbot_document_chunks (Solo administradores)
DROP POLICY IF EXISTS "Admins can manage chatbot_document_chunks" ON public.chatbot_document_chunks;
CREATE POLICY "Admins can manage chatbot_document_chunks" ON public.chatbot_document_chunks
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 7. CONFIGURACIÓN DEL BUCKET PRIVADO EN SUPABASE STORAGE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chatbot-docs',
    'chatbot-docs',
    false,
    15728640, -- 15 MB
    ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'text/plain',
        'text/markdown'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de RLS en storage.objects para bucket chatbot-docs (Solo admins)
DROP POLICY IF EXISTS "Admins can select chatbot-docs" ON storage.objects;
CREATE POLICY "Admins can select chatbot-docs" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'chatbot-docs' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can insert chatbot-docs" ON storage.objects;
CREATE POLICY "Admins can insert chatbot-docs" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'chatbot-docs' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can update chatbot-docs" ON storage.objects;
CREATE POLICY "Admins can update chatbot-docs" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'chatbot-docs' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can delete chatbot-docs" ON storage.objects;
CREATE POLICY "Admins can delete chatbot-docs" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'chatbot-docs' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- ==============================================================================
-- MIGRACIÓN BASE DE DATOS: BIBLIOTECA MULTIMEDIA (MEDIA LIBRARY CORE) - FASE 1
-- Fecha: 3 de agosto de 2026
-- Rama: feature/media-library-core
-- Descripción: Creación de esquemas aditivos para public.media_categories,
--              public.media_items, índices, triggers de actualización,
--              datos semilla y políticas RLS y Storage para bucket privado.
-- ==============================================================================

-- 1. FUNCIÓN TRIGGER PARA UPDATED_AT (Exclusiva del módulo Media Library)
CREATE OR REPLACE FUNCTION public.set_media_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TABLA PUBLIC.MEDIA_CATEGORIES
CREATE TABLE IF NOT EXISTS public.media_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para updated_at en media_categories
DROP TRIGGER IF EXISTS trg_media_categories_updated_at ON public.media_categories;
CREATE TRIGGER trg_media_categories_updated_at
    BEFORE UPDATE ON public.media_categories
    FOR EACH ROW
    EXECUTE PROCEDURE public.set_media_library_updated_at();

-- 3. TABLA PUBLIC.MEDIA_ITEMS
CREATE TABLE IF NOT EXISTS public.media_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    alt_text TEXT,
    original_filename TEXT NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'media-library',
    storage_path TEXT NOT NULL UNIQUE,
    public_url TEXT, -- NOTA: Nullable. No debe completarse para objetos nuevos del bucket privado 'media-library'. Se usará storage_bucket y storage_path para generar Signed URLs.
    mime_type TEXT NOT NULL,
    file_extension TEXT,
    file_size_bytes BIGINT NOT NULL,
    width INTEGER,
    height INTEGER,
    sha256_hash TEXT NOT NULL,
    category_id UUID REFERENCES public.media_categories(id) ON DELETE SET NULL,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active',
    visibility TEXT NOT NULL DEFAULT 'public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Restricciones (Constraints)
    CONSTRAINT chk_media_items_status CHECK (status IN ('active', 'archived')),
    CONSTRAINT chk_media_items_visibility CHECK (visibility IN ('public', 'private')),
    CONSTRAINT chk_media_items_file_size CHECK (file_size_bytes > 0),
    CONSTRAINT chk_media_items_width CHECK (width IS NULL OR width > 0),
    CONSTRAINT chk_media_items_height CHECK (height IS NULL OR height > 0)
);

-- Trigger para updated_at en media_items
DROP TRIGGER IF EXISTS trg_media_items_updated_at ON public.media_items;
CREATE TRIGGER trg_media_items_updated_at
    BEFORE UPDATE ON public.media_items
    FOR EACH ROW
    EXECUTE PROCEDURE public.set_media_library_updated_at();

-- 4. ÍNDICES DE RENDIMIENTO Y BÚSQUEDA
CREATE INDEX IF NOT EXISTS idx_media_items_status ON public.media_items(status);
CREATE INDEX IF NOT EXISTS idx_media_items_visibility ON public.media_items(visibility);
CREATE INDEX IF NOT EXISTS idx_media_items_category_id ON public.media_items(category_id);
CREATE INDEX IF NOT EXISTS idx_media_items_mime_type ON public.media_items(mime_type);
CREATE INDEX IF NOT EXISTS idx_media_items_sha256_hash ON public.media_items(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_media_items_created_at ON public.media_items(created_at DESC);

-- Índices B-tree en minúsculas para acelerar búsquedas de texto por título y nombre original
CREATE INDEX IF NOT EXISTS idx_media_items_title_lower ON public.media_items(LOWER(title));
CREATE INDEX IF NOT EXISTS idx_media_items_original_filename_lower ON public.media_items(LOWER(original_filename));

-- 5. DATOS SEMILLA IDEMPOTENTES EN PUBLIC.MEDIA_CATEGORIES
INSERT INTO public.media_categories (name, slug, description, is_active)
VALUES 
    ('Eventos', 'eventos', 'Imágenes, afiches y material gráfico de simposios y eventos académicos', true),
    ('Banners', 'banners', 'Banners promocionales para carruseles de encabezado', true),
    ('Recursos', 'recursos', 'Documentos, guías clínicas, presentaciones y PDFs de descarga', true),
    ('Patrocinadores', 'patrocinadores', 'Logos e imágenes institucionales de empresas aliadas', true),
    ('Junta Directiva', 'junta-directiva', 'Fotografías de miembros de la junta directiva y comité', true),
    ('Institucional', 'institucional', 'Material gráfico e imagotipo institucional de SOVOGIN', true),
    ('Documentos', 'documentos', 'Documentación legal, estatutos y formularios', true),
    ('Otros', 'otros', 'Archivos generales sin clasificación específica', true)
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());

-- 6. POLÍTICAS DE SEGURIDAD EN BASE DE DATOS (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.media_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

-- Políticas para public.media_categories
DROP POLICY IF EXISTS "Lectura pública de categorías activas" ON public.media_categories;
CREATE POLICY "Lectura pública de categorías activas" 
    ON public.media_categories FOR SELECT 
    USING (is_active = true);

DROP POLICY IF EXISTS "Gestión de categorías para usuarios autenticados" ON public.media_categories;
CREATE POLICY "Gestión de categorías para usuarios autenticados" 
    ON public.media_categories FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);
-- NOTA DE SEGURIDAD TEMPORAL: La política 'TO authenticated' sigue el patrón actual del proyecto
-- y es TEMPORAL. En la Fase 4 de Seguridad se migrará a verificación explícita de profiles.role = 'admin'.

-- Políticas para public.media_items
DROP POLICY IF EXISTS "Lectura pública de elementos activos y públicos" ON public.media_items;
CREATE POLICY "Lectura pública de elementos activos y públicos" 
    ON public.media_items FOR SELECT 
    USING (status = 'active' AND visibility = 'public');

DROP POLICY IF EXISTS "Gestión total de elementos para usuarios autenticados" ON public.media_items;
CREATE POLICY "Gestión total de elementos para usuarios autenticados" 
    ON public.media_items FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);
-- NOTA DE SEGURIDAD TEMPORAL: La política 'TO authenticated' es TEMPORAL y se actualizará
-- en la Fase 4 para validar que auth.uid() pertenezca a un usuario con perfil de administrador (role = 'admin').

-- 7. POLÍTICAS DE STORAGE PARA BUCKET PRIVADO (media-library)
-- NOTA DE ARQUITECTURA: El bucket 'media-library' debe crearse como PRIVADO (Public bucket = OFF).
-- No existe lectura pública directa en storage.objects. Los archivos se servirán mediante Signed URLs
-- generadas desde el backend utilizando storage_bucket y storage_path tras validar metadatos en media_items.

-- 1) LECTURA en bucket privado
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer media-library" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden leer media-library"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'media-library');

-- 2) INSERCIÓN (CARGA) en bucket privado
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir a media-library" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden subir a media-library"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'media-library');

-- 3) ACTUALIZACIÓN en bucket privado
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar media-library" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden actualizar media-library"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'media-library')
    WITH CHECK (bucket_id = 'media-library');

-- 4) ELIMINACIÓN en bucket privado
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar media-library" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden eliminar media-library"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'media-library');

-- NOTA DE SEGURIDAD TEMPORAL PARA STORAGE: La autorización 'TO authenticated' en las políticas de storage
-- es TEMPORAL y se actualizará en la Fase 4 para restringirse a administradores (role = 'admin').

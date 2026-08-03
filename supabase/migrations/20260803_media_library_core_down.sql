-- ==============================================================================
-- REVERSIÓN / ROLLBACK: BIBLIOTECA MULTIMEDIA (MEDIA LIBRARY CORE) - FASE 1
-- Fecha: 3 de agosto de 2026
-- Rama: feature/media-library-core
-- Descripción: Script idempotente para eliminar objetos de base de datos creados en la Fase 1.
-- ==============================================================================
-- NOTA IMPORTANTE DE ARCHIVOS Y STORAGE:
-- Este script de rollback NO elimina:
--   1. El bucket 'media-library' creado en Supabase Storage.
--   2. Los objetos o archivos físicos almacenados en el bucket.
--   3. El registro del bucket en storage.buckets.
-- Si requiere eliminar el bucket, debe vaciarse de objetos primero y borrarse manualmente desde la consola.
-- ==============================================================================

-- 1. ELIMINAR LAS 4 POLÍTICAS SEPARADAS DE STORAGE PARA BUCKET PRIVADO media-library
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer media-library" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir a media-library" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar media-library" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar media-library" ON storage.objects;

-- 2. ELIMINAR POLÍTICAS RLS EN TABLAS DE MEDIA LIBRARY
DROP POLICY IF EXISTS "Lectura pública de categorías activas" ON public.media_categories;
DROP POLICY IF EXISTS "Gestión de categorías para usuarios autenticados" ON public.media_categories;
DROP POLICY IF EXISTS "Lectura pública de elementos activos y públicos" ON public.media_items;
DROP POLICY IF EXISTS "Gestión total de elementos para usuarios autenticados" ON public.media_items;

-- 3. ELIMINAR TABLA PUBLIC.MEDIA_ITEMS Y SUS TRIGGERS/ÍNDICES
DROP TRIGGER IF EXISTS trg_media_items_updated_at ON public.media_items;
DROP TABLE IF EXISTS public.media_items;

-- 4. ELIMINAR TABLA PUBLIC.MEDIA_CATEGORIES Y SUS TRIGGERS/ÍNDICES
DROP TRIGGER IF EXISTS trg_media_categories_updated_at ON public.media_categories;
DROP TABLE IF EXISTS public.media_categories;

-- 5. ELIMINAR FUNCIÓN TRIGGER EXCLUSIVA DEL MÓDULO MEDIA LIBRARY
DROP FUNCTION IF EXISTS public.set_media_library_updated_at();

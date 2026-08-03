# Estrategia de Base de Datos para Módulos Reutilizables - SOVOGIN

**Fecha:** 3 de agosto de 2026  
**Enfoque:** Esquema aditivo, idempotente y sin migraciones destructivas.

---

> [!IMPORTANT]
> **Aviso de Fase de Análisis:** Este documento contiene las sentencias DDL y estrategia de modelo recomendadas para futuras fases. **NO se debe ejecutar ninguna sentencia SQL en la base de datos en esta etapa.**

---

## 1. Tablas Recomendadas para la Biblioteca Multimedia

### A. Tabla `public.media_categories`
Clasificación temática de archivos (ej. Banners, Simposios, Memorias, Logos, Documentos Legales).

```sql
CREATE TABLE IF NOT EXISTS public.media_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### B. Tabla `public.media_items`
Registro centralizado de metadatos de archivos multimedia.

```sql
CREATE TABLE IF NOT EXISTS public.media_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    alt_text TEXT,
    description TEXT,
    original_filename TEXT NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'media',
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    width INTEGER,
    height INTEGER,
    checksum TEXT,
    is_public BOOLEAN DEFAULT true NOT NULL,
    is_archived BOOLEAN DEFAULT false NOT NULL,
    category_id UUID REFERENCES public.media_categories(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### C. Tabla `public.media_tags` y `public.media_item_tags`
Etiquetado N:M para búsqueda flexible.

```sql
CREATE TABLE IF NOT EXISTS public.media_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.media_item_tags (
    media_id UUID REFERENCES public.media_items(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.media_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (media_id, tag_id)
);
```

---

## 2. Índices de Rendimiento Recomendados

Para optimizar las búsquedas y el control de duplicados en la base de datos:

```sql
-- Búsqueda de duplicados por hash
CREATE INDEX IF NOT EXISTS idx_media_items_checksum ON public.media_items (checksum);

-- Filtrado por tipo de archivo y categoría
CREATE INDEX IF NOT EXISTS idx_media_items_mime_type ON public.media_items (mime_type);
CREATE INDEX IF NOT EXISTS idx_media_items_category_id ON public.media_items (category_id);

-- Búsqueda por estado activo y fecha
CREATE INDEX IF NOT EXISTS idx_media_items_created_at ON public.media_items (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_items_is_archived ON public.media_items (is_archived);
```

---

## 3. Principios de Migración Segura y Aditiva

1. **Uso Exclusivo de Cláusulas Guardas**:
   Toda migración debe utilizar `IF NOT EXISTS` al crear tablas, columnas o índices.
2. **Prohibición Total de Sentencias Destructivas**:
   - Queda estrictamente prohibido usar `DROP TABLE`, `DROP COLUMN` o `ALTER TABLE ... RENAME COLUMN` en tablas existentes (`events`, `sponsors`, `resources`, `banners`, `board_members`).
3. **Columnas de Clave Foránea Opcionales**:
   En fases futuras donde un módulo (ej. `events`) haga referencia a un `media_id`, la nueva columna `media_id` debe ser **NULLABLE** para no invalidar los registros históricos que solo poseen `image_url`.

---

## 4. Estrategia de Rollback

- Cada archivo de migración SQL debe acompañarse de su respectivo script de reversión (`down.sql`), el cual únicamente eliminará las tablas creadas aditivamente (`media_item_tags`, `media_tags`, `media_items`, `media_categories`) sin modificar las tablas preexistentes del negocio.

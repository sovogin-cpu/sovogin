# Propuesta de Esquema de Base de Datos: Content CMS Core

**Fecha:** 3 de agosto de 2026  
**Módulo:** Database Schema (`supabase/migrations`)  
**Estado:** Propuesta técnica de diseño (Sin ejecutar SQL)

---

## 1. Tablas Principales

### A. Tabla `public.content_posts`

Almacena los artículos y publicaciones de los diferentes canales del CMS.

```sql
CREATE TABLE IF NOT EXISTS public.content_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    excerpt TEXT,
    content JSONB NOT NULL DEFAULT '[]'::jsonb,
    featured_media_id UUID REFERENCES public.media_items(id) ON DELETE SET NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    visibility TEXT NOT NULL DEFAULT 'public',
    published_at TIMESTAMP WITH TIME ZONE,
    seo_title TEXT,
    seo_description TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Restricciones de Validez
    CONSTRAINT chk_content_posts_channel CHECK (channel IN ('innovation', 'community', 'academic', 'news')),
    CONSTRAINT chk_content_posts_status CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT chk_content_posts_visibility CHECK (visibility IN ('public', 'members_only')),
    CONSTRAINT uq_content_posts_channel_slug UNIQUE (channel, slug)
);
```

### B. Tabla `public.content_categories`

Categorías organizativas asignables a publicaciones.

```sql
CREATE TABLE IF NOT EXISTS public.content_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel TEXT, -- Opcional: NULL si aplica a todos los canales, o específico ('innovation', 'community')
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT uq_content_categories_slug UNIQUE (slug)
);
```

### C. Tabla Intermedia `public.content_post_categories`

Relación de muchos a muchos (N:M) entre publicaciones y categorías.

```sql
CREATE TABLE IF NOT EXISTS public.content_post_categories (
    post_id UUID REFERENCES public.content_posts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.content_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    PRIMARY KEY (post_id, category_id)
);
```

---

## 2. Índices de Rendimiento y Búsqueda

```sql
-- Índices para filtrado rápido por canal, estado y visibilidad
CREATE INDEX IF NOT EXISTS idx_content_posts_channel_status ON public.content_posts(channel, status);
CREATE INDEX IF NOT EXISTS idx_content_posts_published_at ON public.content_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_posts_is_featured ON public.content_posts(is_featured);

-- Índice para acelerar búsquedas de texto por título
CREATE INDEX IF NOT EXISTS idx_content_posts_title_lower ON public.content_posts(LOWER(title));

-- Índice GIN para búsquedas estructuradas en el JSONB de bloques
CREATE INDEX IF NOT EXISTS idx_content_posts_content_gin ON public.content_posts USING gin (content);
```

---

## 3. Estrategia de Banners (`public.banners`)

Para dar soporte a las nuevas posiciones de banners en Innovación y Comunidad sin romper la tabla `banners` existente:

### Modificación de la Restricción CHECK de `position`:
```sql
ALTER TABLE public.banners 
DROP CONSTRAINT IF EXISTS banners_position_check;

ALTER TABLE public.banners 
ADD CONSTRAINT banners_position_check CHECK (
  position IN (
    'HOME_HERO',
    'EVENTS_HEADER',
    'RESOURCES_HEADER',
    'ASSOCIATION_HEADER',
    'INNOVATION_HEADER',
    'INNOVATION_INLINE',
    'COMMUNITY_HEADER',
    'COMMUNITY_INLINE'
  )
);
```

---

## 4. Estrategia de Migración y Rollback

1. **Migración Aditiva**: Las nuevas tablas `content_posts`, `content_categories` y `content_post_categories` son aditivas y no alteran ni destruyen datos existentes.
2. **Rollback Seguro**: En caso de reversión, se ejecutan las sentencias `DROP TABLE IF EXISTS` correspondientes y la restitución del constraint original de `banners`.

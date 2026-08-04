# Seguridad, RLS y Políticas de Acceso: Content CMS Core

**Fecha:** 3 de agosto de 2026  
**Módulo:** Security & Access Control  
**Rama:** `feature/content-cms-core`

---

## 1. Políticas de Seguridad RLS (Row Level Security)

### A. Políticas para `public.content_posts`

```sql
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

-- 1. Lectura pública de artículos publicados
CREATE POLICY "Lectura pública de artículos publicados"
    ON public.content_posts FOR SELECT
    USING (
        status = 'published' 
        AND (published_at IS NULL OR published_at <= timezone('utc'::text, now()))
        AND visibility = 'public'
    );

-- 2. Gestión total para administradores autenticados
CREATE POLICY "Gestión total de artículos para usuarios autenticados"
    ON public.content_posts FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
```

### B. Políticas para `public.content_categories`

```sql
ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;

-- 1. Lectura pública de categorías activas
CREATE POLICY "Lectura pública de categorías activas"
    ON public.content_categories FOR SELECT
    USING (is_active = true);

-- 2. Gestión total para administradores autenticados
CREATE POLICY "Gestión de categorías para usuarios autenticados"
    ON public.content_categories FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
```

---

## 2. Análisis del Patrón `TO authenticated` y Ruta de Migración

Actualmente, las políticas RLS del proyecto autorizan operaciones de edición a cualquier usuario con rol `authenticated`.

### Riesgo Identificado:
Cualquier usuario autenticado en la plataforma (incluyendo futuros asociados o usuarios del portal) podría potencialmente realizar peticiones `UPDATE` o `INSERT` si no se restringe por rol administrativo.

### Plan de Mitigación (Fase de Seguridad Global):
Se migrará de `TO authenticated` a una verificación explícita del perfil administrativo mediante la tabla `profiles`:
```sql
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
```

---

## 3. Prevención de Inyecciones XSS y Sanitización

1. **Evitar HTML Arbitrario**: Al utilizar JSONB por bloques, el frontend no utiliza `dangerouslySetInnerHTML`.
2. **Renderizado Seguro de Componentes**: Los textos se renderizan como nodos React nativos (`<p>{block.data.text}</p>`), impidiendo la ejecución de scripts.
3. **Embeds de YouTube Seguros**: Se valida que `youtube_video_id` coincida con la expresión regular de IDs válidos (`/^[a-zA-Z0-9_-]{11}$/`) antes de renderizar el `<iframe>`.

---

## 4. Gestión de Archivos Multimedia Privados

- Los artículos del CMS que hagan referencia a archivos en el bucket privado `media-library` resolverán Signed URLs en el servidor o cliente mediante `createSignedMediaUrl(supabase, storage_path, 3600)`.
- Si un archivo multimedia es marcado como `archived` en `media_items`, el motor del CMS muestra un componente sustituto ("*Imagen no disponible*") sin romper el renderizado de la página.

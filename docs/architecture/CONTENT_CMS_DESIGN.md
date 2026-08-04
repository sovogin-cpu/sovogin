# Diseño Funcional y Técnico: Motor CMS Reutilizable (Content Core)

**Fecha:** 3 de agosto de 2026  
**Módulo:** Content CMS Core (`src/modules/content` / `src/lib/content`)  
**Rama:** `feature/content-cms-core`

---

## 1. Contexto y Objetivos

SOVOGIN requiere dos nuevas secciones públicas administrables:

1. **Innovación (`innovation`)**: Artículos académicos, divulgación técnica, novedades en ginecología y obstetricia, imágenes, videos de YouTube, material descargable, categorías y banners promocionales.
2. **A la Comunidad (`community`)**: Sección de libre acceso público (sin requerir inicio de sesión), material educativo sobre salud femenina, videos informativos, categorías, banners promocionales, buscador y un directorio público de médicos asociados.

Para evitar la duplicación de código y garantizar mantenibilidad, ambas secciones compartirán un **único motor de contenidos reutilizable (Content CMS Core)** capaz de gestionar múltiples canales presentes y futuros.

---

## 2. Decisiones Arquitectónicas de Formato de Contenido

Se evaluaron tres enfoques para el almacenamiento del contenido de las publicaciones:

| Criterio | Opción A: HTML Arbitrario | Opción B: Markdown Puro | Opción C: JSON Estructurado por Bloques (RECOMENDADA) |
| :--- | :--- | :--- | :--- |
| **Seguridad XSS** | **Alto Riesgo**. Requiere sanitización pesada en runtime (`DOMPurify`/`sanitize-html`). | **Medio Riesgo**. Permite HTML embebido si no se deshabilita explícitamente. | **Excelente (10/10)**. No ejecuta código ni etiquetas script; renderizado 100% React tipado. |
| **Edición / UX** | Complejo de controlar visualmente; tiende a romper estilos globales. | Curva de aprendizaje para usuarios no técnicos; limitado para modales y widgets. | **Intuitivo y seguro**. Bloques visuales (párrafos, títulos, imágenes, videos, alertas). |
| **Medios y Videos** | Enlaces planos difíciles de auditar o sustituir. | URLs relativas/absolutas planas. | **Integración Nativa**. Guarda `media_id` de `media_items` y IDs de YouTube parametrizados. |
| **Extensibilidad** | Baja. Rompe layouts si cambian las clases CSS. | Limitada a lo que soporte el parser de Markdown. | **Alta**. Se pueden añadir bloques nuevos (ej. encuestas, citaciones, banners) sin migrar BD. |

### Decisión Final: **Opción C - JSON Estructurado por Bloques (JSONB)**

Se adopta la estructura de **Bloques en JSONB**. El campo `content` de cada publicación (`content_posts.content`) almacenará un arreglo de objetos JSON fuertemente tipados.

#### Estructura del JSONB de Bloques:
```json
[
  {
    "id": "blk_01H1234567",
    "type": "heading",
    "data": { "level": 2, "text": "Avances en Laparoscopia Ginecológica" }
  },
  {
    "id": "blk_01H1234568",
    "type": "paragraph",
    "data": { "text": "La cirugía mínimamente invasiva ha transformado..." }
  },
  {
    "id": "blk_01H1234569",
    "type": "image",
    "data": {
      "media_id": "550e8400-e29b-41d4-a716-446655440000",
      "caption": "Procedimiento en Quirófano 3",
      "alt_text": "Equipo quirúrgico en procedimiento laparoscópico"
    }
  },
  {
    "id": "blk_01H1234570",
    "type": "youtube",
    "data": {
      "youtube_video_id": "dQw4w9WgXcQ",
      "caption": "Video explicativo de la técnica quirúrgica"
    }
  },
  {
    "id": "blk_01H1234571",
    "type": "attachment",
    "data": {
      "media_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "title": "Descargar Guía de Manejo Clínico (PDF)",
      "file_size": "2.4 MB"
    }
  }
]
```

---

## 3. Canales y Extensibilidad

El motor de contenidos utiliza la columna `channel` (`TEXT NOT NULL`) con una restricción de chequeo:
- `innovation`: Artículos científicos y académicos para profesionales.
- `community`: Artículos de educación en salud para el público general.
- *(Canales futuros configurables como `academic`, `news`, `podcasts`)*.

---

## 4. Integración con la Biblioteca Multimedia (`media_items`)

El CMS se integra con la **Biblioteca Multimedia de SOVOGIN** (`public.media_items` y bucket privado `media-library`):

1. **Imagen Destacada (`featured_media_id`)**: Clave foránea a `media_items(id) ON DELETE SET NULL`.
2. **Bloques de Imagen y Archivos Adjuntos**: Guardan el UUID de `media_items`.
3. **Generación de URLs Firmadas**: Las vistas públicas y administrativas resuelven en runtime la URL firmada (Signed URL) del archivo utilizando `createSignedMediaUrl(supabase, storage_path, 3600)` si el archivo está en el bucket privado.

---

## 5. Integración con el Sistema de Banners

Para renderizar banners promocionales en las vistas públicas de Innovación y Comunidad:
- Se consulta la tabla `public.banners` filtrando por las nuevas posiciones:
  - `INNOVATION_HEADER` (Banner superior en `/innovacion`)
  - `INNOVATION_INLINE` (Banner entre artículos o barra lateral en `/innovacion`)
  - `COMMUNITY_HEADER` (Banner superior en `/comunidad`)
  - `COMMUNITY_INLINE` (Banner en `/comunidad`)

---

## 6. Flujo Editorial de Publicaciones

```text
[Borrador (draft)] ──► [Publicado (published)] ──► [Archivado (archived)]
         │                        ▲
         └─► [Programado] ────────┘ (cuando now() >= published_at)
```

- **Borrador (`draft`)**: Visible únicamente en el panel de administración.
- **Publicado (`published`)**: Visible en las rutas públicas si `published_at <= NOW()`.
- **Programado (`published` con `published_at > NOW()`)**: Se publica automáticamente cuando llega la fecha.
- **Archivado (`archived`)**: Oculto en las vistas públicas y administrativas por defecto.

---

## 7. Arquitectura de Interfaces UI

### A. Panel Administrativo (`/admin/contenido`)
- Lista tabulada por Canal (`innovation` / `community`).
- Filtros por Estado, Categoría y Búsqueda textual.
- Editor de Bloques (`ContentBlockEditor.tsx`).
- Selector modal multimedia integrado (`MediaSelectorModal.tsx`).

### B. Vistas Públicas
- `/innovacion`: Feed de artículos destacados, categorías y reproductor de videos.
- `/innovacion/[slug]`: Vista detallada del artículo con renderizado dinámico de bloques.
- `/comunidad`: Portal educativo de libre acceso, categorías, videos y buscador.
- `/comunidad/[slug]`: Artículo educativo sobre salud femenina.
- `/comunidad/directorio`: Directorio público de médicos asociados.

# Diseño Funcional y Técnico: Biblioteca Multimedia Centralizada

**Fecha:** 3 de agosto de 2026  
**Módulo:** Media Library (`src/modules/media`)

---

## 1. Propósito y Objetivos

Diseñar una **Biblioteca Multimedia Centralizada** independiente que permita a la administración de SOVOGIN (y futuras plataformas de asociaciones médicas) subir, organizar, buscar, reutilizar y gestionar todo tipo de archivos digitales sin duplicar archivos en almacenamiento ni romper las URLs existentes.

---

## 2. Tipos de Archivos Soportados

| Categoría | Formatos Permitidos | Tipos MIME | Límite Máximo Sugerido |
| :--- | :--- | :--- | :--- |
| **Imágenes** | `.webp`, `.png`, `.jpg`, `.jpeg`, `.svg` | `image/webp`, `image/png`, `image/jpeg`, `image/svg+xml` | 10 MB |
| **Documentos** | `.pdf`, `.docx`, `.doc`, `.pptx`, `.ppt` | `application/pdf`, `application/vnd.openxmlformats-officedocument...` | 50 MB |
| **Videos** | `.mp4`, `.webm` | `video/mp4`, `video/webm` | 200 MB |
| **Enlaces Externos** | YouTube, Vimeo, Drive, URLs directas | `external/url` | N/A |

---

## 3. Estructura de Metadatos de un Archivo (`MediaItem`)

Cada archivo registrado en la biblioteca contiene la siguiente estructura de metadatos completa:

```typescript
export interface MediaItem {
  id: string;                      // UUID único
  title: string;                   // Título descriptivo del archivo
  alt_text: string | null;         // Texto alternativo accesible para imágenes
  description: string | null;      // Descripción amplia o notas internas
  original_filename: string;       // Nombre original del archivo subido
  storage_bucket: string;          // Bucket donde se aloja ('media', 'banners', etc.)
  storage_path: string;            // Ruta dentro del bucket ('2026/08/uuid.webp')
  public_url: string;              // URL pública o firmada de acceso
  mime_type: string;               // Tipo MIME del archivo
  size_bytes: number;              // Tamaño exacto en bytes
  width: number | null;            // Ancho en píxeles (si es imagen/video)
  height: number | null;           // Alto en píxeles (si es imagen/video)
  checksum: string | null;         // Hash SHA-256 para detección de duplicados
  is_public: boolean;              // Indica si es de libre acceso o requiere Auth/Verificación
  is_archived: boolean;            // Marcado suave para archivos ocultos/archivados
  category_id: string | null;      // ID de la categoría asociada
  created_by: string | null;       // UUID del usuario/admin que subió el archivo
  created_at: string;              // ISO Timestamp de creación
  updated_at: string;              // ISO Timestamp de actualización
  tags?: string[];                 // Lista de etiquetas asociadas
}
```

---

## 4. Flujo de Carga y Prevención de Duplicados

```text
[Selección de Archivo en UI]
             │
             ▼
[Cálculo de Hash SHA-256 en Cliente (Crypto API)]
             │
             ▼
[Consulta a Base de Datos: SELECT * FROM media_items WHERE checksum = hash]
             │
   ┌─────────┴─────────┐
   │ (Hash ya existe)  │ (Hash NO existe)
   ▼                   ▼
[Devolver MediaItem  [Subir a Supabase Storage bucket 'media']
 existente sin volver   │
 a subir archivo]       ▼
                     [Registrar metadatos en tabla media_items]
                        │
                        ▼
                     [Devolver nuevo MediaItem]
```

### Reglas de Deduplicación:
1. Antes de realizar el `upload` físico a Supabase Storage, la aplicación calcula en cliente el hash SHA-256 de los bytes del archivo.
2. Si el hash coincide con un `MediaItem` activo previamente cargado, el sistema reutiliza la instancia existente y notifica al administrador ("*Este archivo ya existe en la biblioteca y ha sido reutilizado*").
3. Esto evita el desperdicio de almacenamiento y ancho de banda.

---

## 5. Búsqueda y Filtrado

La administración podrá filtrar el catálogo de archivos mediante:
- **Búsqueda textual**: Por `title`, `original_filename`, `alt_text` o `description`.
- **Filtro por Tipo MIME / Categoría**: Imágenes, Documentos PDF/Word, Videos, Enlaces Externos.
- **Etiquetas (Tags)**: Ej. `#simposio2026`, `#junta`, `#logo`, `#guia-clinica`.
- **Estado**: Activo vs. Archivado.
- **Rango de Fechas**: Por fecha de subida.

---

## 6. Diseño de Componentes UI

### A. Vista Administrativa (`src/app/admin/media/page.tsx`)
Pestaña en el panel de administración con:
- Barra superior de búsqueda, selector de tipo de archivo y botón de subir.
- Cuadrícula (Grid) interactiva de archivos con vista previa (miniatura para imágenes, icono representativo para documentos/videos).
- Panel lateral de detalle para editar `title`, `alt_text`, `description`, `category` y copiar la URL pública.

### B. Selector Multimedia Reutilizable (`src/components/media/MediaSelectorModal.tsx`)
Modal o Drawer que se puede invocar desde cualquier módulo (Banners, Eventos, Patrocinadores):
```tsx
<MediaSelectorModal
  isOpen={isMediaModalOpen}
  onClose={() => setIsMediaModalOpen(false)}
  allowedTypes={["image/webp", "image/png", "image/jpeg"]}
  onSelect={(mediaItem: MediaItem) => {
    setFormData({ ...formData, image_url: mediaItem.public_url });
  }}
/>
```

---

## 7. Compatibilidad con Archivos y Buckets Existentes

Para mantener funcionando los buckets históricos (`event-images`, `banners`, `resources`, `sponsors`, `board-members`):
- Los registros históricos de eventos, sponsors, etc., conservan sus cadenas de URL directas existentes.
- Un script de indexación opcional podrá registrar gradualmente los archivos existentes en la tabla `media_items` asignándoles su bucket original y marcando su `checksum`.
- La biblioteca soportará tanto archivos alojados en el nuevo bucket central `media` como archivos alojados en los buckets legacy.

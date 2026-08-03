# Hoja de Ruta de Implementación (Implementation Roadmap) - SOVOGIN

**Fecha:** 3 de agosto de 2026  
**Estrategia:** Fases pequeñas, incrementales, aisladas y con puntos de retorno (rollback) claros.

---

## FASE 0: Auditoría y Diseño de Arquitectura (COMPLETADA)
- **Alcance**: Inspección del repositorio, análisis de tablas, buckets, controladores, patrones de almacenamiento y redacción de documentos de arquitectura en `docs/architecture/`.
- **Estado**: ✅ Completada (Fase de análisis pura).

---

## FASE 1: Creación de la Biblioteca Multimedia Independiente (Siguiente Paso Recomendado)

> [!NOTE]
> En esta primera fase de desarrollo, la Biblioteca Multimedia se construirá como un **módulo 100% independiente**. No se modificarán las pantallas ni las tablas de los módulos existentes (`events`, `banners`, `resources`, `sponsors`, `board_members`).

### A. Entregables
1. Creación de las tablas aditivas `media_categories`, `media_items`, `media_tags` y `media_item_tags` en Supabase.
2. Configuración del nuevo bucket de Storage `media` en Supabase.
3. Creación del módulo de servicio `src/modules/media/services/mediaService.ts`.
4. Creación del panel administrativo de gestión de medios en `src/app/admin/media/page.tsx`.
5. Creación del componente selector reutilizable `src/components/media/MediaSelectorModal.tsx`.

### B. Dependencias
- Ninguna sobre otros módulos. Depende únicamente del cliente de Supabase existente.

### C. Criterios de Aceptación
- El administrador puede subir imágenes, PDF, Word, PPT y videos desde `/admin/media`.
- El sistema detecta archivos duplicados por hash SHA-256 sin re-subirlos físicamente.
- Es posible buscar archivos por título, categoría o etiquetas.
- El componente `MediaSelectorModal` puede abrirse en modo demo y retornar un objeto `MediaItem`.
- **Ninguna funcionalidad actual de la aplicación sufre alteraciones.**

### D. Commits Sugeridos
- `feat(db): add media library additive schema`
- `feat(media): implement mediaService for uploads, hashing, and metadata`
- `feat(media): create admin media library management page at /admin/media`
- `feat(media): build reusable MediaSelectorModal component`

### E. Punto de Rollback
- Si se requiere revertir esta fase, basta con eliminar la carpeta `src/modules/media`, la ruta `/admin/media` y ejecutar el script `down.sql` de las tablas `media_*`. El resto del sistema continuará funcionando sin ninguna afectación.

---

## FASE 2: Habilitación Opcional del Selector Multimedia en Módulos Admin

### A. Alcance
- Integrar opcionalmente el `MediaSelectorModal` en los formularios de administración:
  - `src/app/admin/banners/page.tsx`
  - `src/app/admin/sponsors/page.tsx`
  - `src/app/admin/recursos/page.tsx`
  - `src/app/admin/junta/page.tsx`
  - `src/app/admin/eventos/page.tsx`

### B. Garantía de Compatibilidad
- Al seleccionar una imagen/documento desde la Media Library, el selector devuelve la `public_url`, manteniéndose la asignación a las columnas actuales (`image_url`, `logo_url`, `file_url`). No se rompe el esquema existente.

### C. Criterios de Aceptación
- Un administrador puede elegir una imagen previamente subida a la Media Library para asignarla a un evento o banner sin tener que volver a cargarla.

### D. Commits Sugeridos
- `feat(admin-banners): integrate MediaSelectorModal for banner image selection`
- `feat(admin-sponsors): integrate MediaSelectorModal for sponsor logo selection`
- `feat(admin-events): integrate MediaSelectorModal for event covers`

---

## FASE 3: Indexación de Archivos Históricos y Deduplicación Avanzada

### A. Alcance
- Ejecutar un script batch administrativo para leer los archivos existentes en los buckets legacy (`event-images`, `banners`, `resources`, `sponsors`, `board-members`) y registrar sus metadatos en `media_items` para permitir su búsqueda en la biblioteca central.

### B. Criterios de Aceptación
- Los logos e imágenes subidos con anterioridad aparecen en la vista de la Media Library con la etiqueta `#legacy`.

---

## FASE 4: Refuerzo de Seguridad RLS y Roles en Supabase

### A. Alcance
- Actualizar el middleware de proxy (`src/utils/supabase/proxy.ts`) para verificar la función `public.is_admin()`.
- Aplicar políticas RLS estrictas en todas las tablas administrativas.

### B. Criterios de Aceptación
- Usuarios no administradores son redirigidos fuera de `/admin`.
- Las pruebas automáticas de API fallan con estado 403 si no se proporciona un JWT con rol `admin`.

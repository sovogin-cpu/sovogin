# Roadmap de Implementación Incremental: Content CMS Core

**Fecha:** 3 de agosto de 2026  
**Proyecto:** SOVOGIN Content CMS & Doctor Directory

---

## Fases de Desarrollo

```text
Fase 1: Core BD (Migración & Tipos) ──► Fase 2: Repositorio Backend ──► Fase 3: Editor de Bloques UI
                                                                                │
Fase 6: Banners ◄── Fase 5: Sección Comunidad ◄── Fase 4: Sección Innovación ◄──┘
     │
     ▼
Fase 7: Directorio Médico Público
```

---

### Fase 1: Base de Datos Core y Tipos TypeScript
- **Entregables**:
  - Migración SQL `20260804_content_cms_core.sql` (`content_posts`, `content_categories`, `content_post_categories`).
  - Definición de interfaces TypeScript en `src/lib/content/types.ts`.
- **Criterios de Aceptación**:
  - Tablas creadas con restricciones y RLS sin afectar módulos existentes.
  - Tipado 100% explícito sin `any`.

---

### Fase 2: Repositorio de Contenidos (`content-repository.ts`)
- **Entregables**:
  - Funciones `listContentPosts`, `getContentPostBySlug`, `createContentPost`, `updateContentPost`, `archiveContentPost`.
  - Funciones de filtrado por canal, categoría y búsqueda.
- **Criterios de Aceptación**:
  - Pruebas de consulta por canal (`innovation` vs `community`).
  - Soporte de resolución de metadatos de `media_items`.

---

### Fase 3: Editor de Bloques Administrativo UI
- **Entregables**:
  - Componente `ContentBlockEditor.tsx`.
  - Integración con `MediaUploadDialog` y selector de la Biblioteca Multimedia.
- **Criterios de Aceptación**:
  - Permite agregar, reordenar y eliminar bloques (párrafo, título, imagen, video YouTube, adjunto).

---

### Fase 4: Sección Pública de Innovación (`/innovacion`)
- **Entregables**:
  - Páginas `/innovacion` y `/innovacion/[slug]`.
  - Renderizador de bloques público `ContentBlockRenderer.tsx`.
- **Criterios de Aceptación**:
  - Carga fluida, SEO optimizado y renderizado responsivo.

---

### Fase 5: Sección Pública de Comunidad (`/comunidad`)
- **Entregables**:
  - Páginas `/comunidad` y `/comunidad/[slug]`.
  - Portal educativo sin requerir login de usuario.
- **Criterios de Aceptación**:
  - Filtro por categorías educativas y buscador integrado.

---

### Fase 6: Integración con Sistema de Banners
- **Entregables**:
  - Actualización del constraint de `banners` para posiciones `INNOVATION_*` y `COMMUNITY_*`.
  - Integración de carrusel de banners en vistas públicas de Innovación y Comunidad.
- **Criterios de Aceptación**:
  - Banners configurables desde `/admin/banners`.

---

### Fase 7: Directorio Médico Público (`/comunidad/directorio`)
- **Entregables**:
  - Migración `doctor_directory_profiles`.
  - Módulo administrativo `/admin/directorio` y vista pública `/comunidad/directorio`.
- **Criterios de Aceptación**:
  - Respeto estricto del consentimiento de publicación.
  - Ocultamiento automático si el asociado pasa a estado inactivo.

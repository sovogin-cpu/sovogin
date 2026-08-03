# Arquitectura Objetivo Modular - SOVOGIN

**Fecha:** 3 de agosto de 2026  
**Estrategia:** Evolución modular progresiva sin reescritura destructiva (Strangler Fig Pattern).

---

## 1. Visión General de la Arquitectura Objetivo

La arquitectura propuesta transforma SOVOGIN en un núcleo reutilizable y modular para asociaciones médicas y gremiales. Se mantiene la estructura actual basada en Next.js App Router y Supabase, introduciendo capas claras de responsabilidad que permitan acoplar nuevos módulos independientes (como la **Biblioteca Multimedia Centralizada**) sin interrumpir el funcionamiento de los módulos existentes.

```text
+-----------------------------------------------------------------------+
|                         CAPA DE PRESENTACIÓN                          |
|  (Páginas de App Router, Componentes Admin UI, Modales, Visualizadores) |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                         CAPA DE APLICACIÓN                            |
|     (Servicios de Dominio, Hook Reutilizables, Módulos Independientes)   |
|  [MediaService] [EventsService] [PaymentService] [AuthService] etc.  |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                       CAPA DE INFRAESTRUCTURA                         |
|   (Supabase SSR/Client, Storage Adapters, Openpay API, Gemini API)     |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                         CAPA DE PERSISTENCIA                          |
|         (PostgreSQL en Supabase, Buckets de Storage, RLS Policies)     |
+-----------------------------------------------------------------------+
```

---

## 2. Separación por Capas recomendada

### A. Capa de Dominio (`src/types` o `src/modules/<modulo>/types`)
- Define contratos, interfaces TypeScript y esquemas de validación pura.
- No depende de React, Supabase ni de librerías de UI.
- *Ejemplo*: `MediaItem`, `MediaCategory`, `StorageUploadResult`, `MediaFilterOptions`.

### B. Capa de Aplicación (`src/services` o `src/modules/<modulo>/services`)
- Encapsula las reglas de negocio y los casos de uso.
- Maneja la orquestación de operaciones compuestas (ej. subir archivo a Storage + registrar metadatos en PostgreSQL).
- *Ejemplo*: `mediaService.uploadAndRegister()`, `mediaService.searchMedia()`.

### C. Capa de Infraestructura (`src/lib` / `src/utils/supabase`)
- Provee clientes concretos para comunicación con servicios externos (Supabase Auth, Supabase Storage, Openpay REST API, Resend, Gemini).
- Oculta los detalles de configuración HTTP y clientes SSR.

### D. Capa de Presentación (`src/components` / `src/app`)
- Componentes UI puros y páginas.
- Consume servicios de la capa de aplicación mediante React Hooks personalizados (ej. `useMediaLibrary`).

---

## 3. Estrategia de Módulos Reutilizables y Autónomos

Para garantizar que los módulos sean reutilizables en otros proyectos o asociaciones médicas, cada nuevo módulo debe organizarse de forma encapsulada:

```text
src/
└── modules/
    └── media/
        ├── types/            # Contratos de tipos
        ├── services/         # Lógica de negocio y llamadas a Supabase
        ├── hooks/            # Custom hooks para React
        ├── components/       # Componentes UI (Selector, Uploader, Grid)
        └── index.ts          # API pública exportada del módulo
```

---

## 4. Convenciones de Desarrollo

1. **Adopción Progresiva No Destructiva**:
   No se elimina ni reemplaza código funcional existente en producción. Los módulos antiguos continúan consumiendo sus tablas/columnas actuales (`events.image_url`).
2. **Capa de Abstracción en Subida de Archivos**:
   Cualquier nuevo componente que requiera seleccionar o subir archivos interactúa con la **Media Library**, la cual devuelve tanto el objeto metadato `MediaItem` como la URL pública accesible.
3. **Manejo de Errores Estandarizado**:
   Todos los servicios de aplicación deben retornar un objeto resultado estandarizado:
   ```typescript
   type Result<T> = 
     | { success: true; data: T }
     | { success: false; error: { message: string; code?: string } };
   ```

---

## 5. Garantías de Coexistencia

- **Retrocompatibilidad**: Las URLs directas guardadas históricamente en la base de datos continuarán siendo válidas.
- **Sin Breaking Changes en Base de Datos**: Las nuevas tablas (`media_items`, `media_categories`) se crean de manera aditiva. Ninguna columna existente será renombrada ni borrada.

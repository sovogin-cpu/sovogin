# Runbook de Despliegue y Verificación: Biblioteca Multimedia (Fase 1)

**Fecha:** 3 de agosto de 2026  
**Rama Git:** `feature/media-library-core`  
**Objetivo:** Guía paso a paso para la aplicación manual de la migración de base de datos, creación del bucket de almacenamiento PRIVADO en Supabase, verificación de políticas RLS, generación de Signed URLs y procedimiento de reversión.

---

## 1. Archivos SQL Involucrados

| Tipo | Ruta del Archivo | Descripción |
| :--- | :--- | :--- |
| **Migración (UP)** | [supabase/migrations/20260803_media_library_core.sql](file:///E:/RECURSOS/ANTIGRAVITY/Sovogin/supabase/migrations/20260803_media_library_core.sql) | Creación aditiva de tablas, restricciones, índices, función `set_media_library_updated_at`, datos semilla, RLS y 4 políticas para bucket privado. |
| **Rollback (DOWN)** | [supabase/migrations/20260803_media_library_core_down.sql](file:///E:/RECURSOS/ANTIGRAVITY/Sovogin/supabase/migrations/20260803_media_library_core_down.sql) | Eliminación limpia e idempotente de las tablas y políticas de la Fase 1 (sin CASCADE y sin eliminar archivos en Storage). |

---

## 2. Creación Manual del Bucket PRIVADO en Supabase Storage

1. Ingrese a su consola de **Supabase Dashboard** -> Proyecto **SOVOGIN**.
2. Navegue a la sección **Storage** en la barra lateral izquierda.
3. Haga clic en **New Bucket** ("Nuevo Bucket").
4. Configure el bucket con los siguientes parámetros obligatorios:
   - **Bucket Name**: `media-library`
   - **Public Bucket**: **OFF (DESACTIVADO)**. El bucket debe ser estrictamente **PRIVADO**.
   - **Allowed MIME Types**: Especificar los tipos MIME permitidos (ver Sección 3).
   - **File Size Limit**: `10485760` (10 MB máximo por archivo inicialmente, equivalente a 10 * 1024 * 1024 bytes).

---

## 3. Configuración de Seguridad y Límites de Carga

### A. Tipos MIME Permitidos Inicialmente
```text
image/jpeg
image/png
image/webp
application/pdf
application/msword
application/vnd.openxmlformats-officedocument.wordprocessingml.document
application/vnd.ms-powerpoint
application/vnd.openxmlformats-officedocument.presentationml.presentation
```

### B. Estrategia de Servido de Archivos (Signed URLs)
- **NO utilizar `getPublicUrl`** para objetos pertenecientes al bucket `media-library`.
- El campo `public_url` en `public.media_items` debe mantenerse `NULL` para nuevos objetos de este bucket.
- La aplicación consumirá las propiedades `storage_bucket` y `storage_path` para generar **Signed URLs** temporales desde el servidor/backend previa validación de metadatos y permisos en `public.media_items`.

---

## 4. Orden de Ejecución de Migración

1. Abra el **SQL Editor** en la consola de Supabase.
2. Abra y copie el contenido del archivo `supabase/migrations/20260803_media_library_core.sql`.
3. Ejecute el script (**Run**).
4. Verifique que no ocurran errores durante la ejecución. La migración es **idempotente** (se puede ejecutar múltiples veces sin falla).

---

## 5. Verificación de Tablas, Índices, RLS y Políticas de Storage

Ejecute las siguientes consultas de comprobación en el SQL Editor:

```sql
-- 1. Verificar existencia de las nuevas tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('media_categories', 'media_items');

-- 2. Verificar que RLS esté activado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('media_categories', 'media_items');

-- 3. Verificar las 8 categorías semilla
SELECT name, slug FROM public.media_categories ORDER BY created_at ASC;

-- 4. Verificar las 4 políticas de storage para el bucket privado 'media-library'
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%media-library%';
```

---

## 6. Procedimiento de Rollback (Reversión)

Si se requiere desmantelar la migración de base de datos de la Fase 1:

1. Abra el **SQL Editor** en la consola de Supabase.
2. Copie y ejecute el contenido de `supabase/migrations/20260803_media_library_core_down.sql`.

> [!CAUTION]
> **Notas sobre el Rollback:**
> - El script de rollback **NO elimina los archivos físicos** ni el bucket `media-library` registrado en Supabase Storage.
> - Para eliminar completamente el bucket `media-library` desde el Dashboard, el bucket **debe estar totalmente vacío de objetos** antes de proceder con su eliminación manual.

---

## 7. Componentes y Módulos que NO Fueron Modificados

Las siguientes áreas continúan 100% aisladas e intactas:

- ❌ `src/` (no se alteró ningún archivo de código ni componentes).
- ❌ `package.json` ni dependencias.
- ❌ Variables de entorno (`.env`).
- ❌ Módulos existentes de Eventos, Banners, Recursos, Patrocinadores, Junta Directiva, Beneficios, Chatbot, Inscritos o Pagos.
- ❌ Buckets históricos de Supabase Storage (`event-images`, `banners`, `resources`, `sponsors`, `board-members`).

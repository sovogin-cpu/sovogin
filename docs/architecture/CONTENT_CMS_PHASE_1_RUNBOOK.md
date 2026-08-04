# Runbook de Despliegue de Base de Datos: Content CMS Core - Fase 1

**Fecha:** 3 de agosto de 2026  
**Rama:** `feature/content-cms-core`  
**Migración:** `supabase/migrations/20260803_content_cms_core.sql`  
**Rollback:** `supabase/migrations/20260803_content_cms_core_down.sql`

---

## 1. Resumen Ejecutivo

Este runbook describe los pasos para auditar, ejecutar, verificar y revertir la migración de base de datos correspondiente a la **Fase 1 del Content CMS Core y Directorio Médico** del proyecto SOVOGIN.

> [!IMPORTANT]
> **Aislamiento Estricto de la Fase 1:**  
> Esta fase incluye **únicamente la capa de base de datos** (tablas, índices, triggers y políticas RLS). No crea páginas ni componentes en `src/`, ni ejecuta consultas de modificación automáticamente.

---

## 2. Pasos de Preparación y Revisión

1. Inspeccionar el contenido de la migración:
   - [supabase/migrations/20260803_content_cms_core.sql](file:///E:/RECURSOS/ANTIGRAVITY/Sovogin/supabase/migrations/20260803_content_cms_core.sql)
2. Verificar que el archivo contenga las cuatro tablas aditivas:
   - `public.content_posts`
   - `public.content_categories`
   - `public.content_post_categories`
   - `public.doctor_directory_profiles`
3. Confirmar que la función trigger sea exclusiva del módulo: `public.set_content_cms_updated_at()`.

---

## 3. Pasos de Ejecución en Supabase

### Opción A: Vía Supabase SQL Editor (Consola Web)
1. Abrir el panel de control del proyecto Supabase.
2. Navegar a **SQL Editor**.
3. Copiar el contenido íntegro de `supabase/migrations/20260803_content_cms_core.sql`.
4. Ejecutar el script y confirmar la respuesta `Success. No rows returned`.

### Opción B: Vía Supabase CLI
```bash
supabase db push
```

---

## 4. Pasos de Verificación

### A. Verificación de Tablas Creadas
Ejecutar la siguiente consulta en el SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('content_posts', 'content_categories', 'content_post_categories', 'doctor_directory_profiles');
```
*Resultado esperado:* 4 filas devueltas.

### B. Verificación de Restricción CHECK de Banners
```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'banners_position_check';
```
*Resultado esperado:* Debe incluir las 8 posiciones (`HOME_HERO`, `EVENTS_HEADER`, `RESOURCES_HEADER`, `ASSOCIATION_HEADER`, `INNOVATION_HEADER`, `INNOVATION_INLINE`, `COMMUNITY_HEADER`, `COMMUNITY_INLINE`).

### C. Prueba de Idempotencia
Ejecutar por segunda vez el archivo `20260803_content_cms_core.sql`.
*Resultado esperado:* Ejecución limpia sin errores de duplicación (`IF NOT EXISTS` y `DROP TRIGGER IF EXISTS` garantizan idempotencia).

---

## 5. Advertencias Importantes para Fases Posteriores

> [!WARNING]
> **1. Políticas RLS Temporales para Autenticados:**  
> Las políticas de modificación `INSERT`, `UPDATE` y `DELETE` se asignaron a `TO authenticated` siguiendo el patrón actual del proyecto. En la Fase de Seguridad Global se restringirán explícitamente a usuarios con perfil de administrador (`role = 'admin'`).

> [!NOTE]
> **2. Estado del Asociado en el Directorio Médico (Fase 7):**  
> La política RLS de `doctor_directory_profiles` valida `is_published = true AND consent_given_at IS NOT NULL`. Cuando se implemente la API pública en la Fase 7, la consulta server-side deberá verificar adicionalmente el valor exacto de `associates.status` (que en el proyecto puede estar registrado como `'Activo'` con mayúscula inicial).

---

## 6. Procedimiento de Rollback (Reversión)

Si se requiere revertir completamente la migración:

1. Copiar el contenido de [supabase/migrations/20260803_content_cms_core_down.sql](file:///E:/RECURSOS/ANTIGRAVITY/Sovogin/supabase/migrations/20260803_content_cms_core_down.sql).
2. Ejecutar en el SQL Editor de Supabase.
3. Verificar que las tablas `content_posts`, `content_categories`, `content_post_categories` y `doctor_directory_profiles` hayan sido eliminadas sin afectar las tablas `associates`, `media_items` o `banners`.
4. Confirmar que la restricción de `banners` haya retornado a las 4 posiciones originales.

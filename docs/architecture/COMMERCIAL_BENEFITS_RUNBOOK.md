# Runbook de Arquitectura y Base de Datos: Módulo Beneficios Comerciales (Fase 1)

> **Versión**: 1.0.0  
> **Fecha**: 3 de agosto de 2026  
> **Rama**: `feature/content-admin-framework`  
> **Estado**: Fase 1 - Definición de Base de Datos y Documentación (Sin componentes React creados)

---

## 🎯 1. Objetivo del Módulo

El módulo de **Beneficios Comerciales** de SOVOGIN proporciona una estructura relacional segura y optimizada para administrar los convenios, descuentos y beneficios especiales ofrecidos a los asociados. Visualmente, este módulo se ubicará en la página principal debajo de las secciones de **Patrocinadores** y **Aliados**.

---

## 📁 2. Archivos Creados

```text
supabase/migrations/20260803_commercial_benefits.sql
supabase/migrations/20260803_commercial_benefits_down.sql
docs/architecture/COMMERCIAL_BENEFITS_RUNBOOK.md
```

> [!IMPORTANT]
> En esta Fase 1 **no se ha modificado ningún archivo bajo `src/`**, ni se han creado páginas o componentes visuales. La base de datos inicia totalmente vacía.

---

## 🔍 3. Cómo Revisar los Scripts SQL

1. Abra [20260803_commercial_benefits.sql](file:///E:/RECURSOS/ANTIGRAVITY/Sovogin/supabase/migrations/20260803_commercial_benefits.sql) para verificar la estructura de tabla, restricciones, índices y políticas RLS.
2. Abra [20260803_commercial_benefits_down.sql](file:///E:/RECURSOS/ANTIGRAVITY/Sovogin/supabase/migrations/20260803_commercial_benefits_down.sql) para inspeccionar la migración de reversión idempotente.

---

## 🚀 4. Cómo Ejecutar la Migración en Supabase

1. Ingrese al panel de administración de **Supabase Dashboard** de SOVOGIN.
2. Diríjase a la sección **SQL Editor**.
3. Copie y pegue el contenido completo de `supabase/migrations/20260803_commercial_benefits.sql`.
4. Haga clic en **Run**.

---

## ✅ 5. Verificación de la Estructura Creada

### A. Estructura de la Tabla y Claves Foráneas (FK)

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'commercial_benefits'
ORDER BY ordinal_position;
```

### B. Verificación de Restricciones (Constraints)

```sql
SELECT conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE c.conrelid = 'public.commercial_benefits'::regclass;
```

### C. Verificación de Índices Creados

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'commercial_benefits';
```

### D. Verificación del Trigger `updated_at`

```sql
SELECT trigger_name, action_timing, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'commercial_benefits';
```

---

## 📊 6. Consultas de Prueba para Validación

### A. Prueba de Filtrado por Vigencia y Estado Activo (Simulación de Consulta Pública)

```sql
SELECT id, name, benefit_title, short_description, link_url, display_order
FROM public.commercial_benefits
WHERE is_active = true
  AND (starts_at IS NULL OR starts_at <= timezone('utc'::text, now()))
  AND (ends_at IS NULL OR ends_at >= timezone('utc'::text, now()))
ORDER BY display_order ASC, created_at DESC;
```

### B. Prueba de Políticas RLS Creadas

```sql
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'commercial_benefits';
```

> [!WARNING]
> **Política Temporal de Administración**:
> La política `"Permitir administracion temporal a usuarios autenticados"` concede acceso `ALL` a usuarios en el rol `authenticated` de forma provisoria durante la Fase 1. En la Fase 2 (interfaz de administración) será reemplazada por una política estricta basada en el rol administrativo (`profiles.role = 'admin'`).

---

## 🔄 7. Prueba de Idempotencia

Ejecute la migración `20260803_commercial_benefits.sql` dos o más veces seguidas en el SQL Editor. La ejecución debe completar sin lanzar errores de duplicidad ni interrumpir la base de datos gracias a las cláusulas `IF NOT EXISTS` y `DROP POLICY IF EXISTS`.

---

## ⏪ 8. Procedimiento de Rollback

En caso de requerir revertir los cambios de la Fase 1:

1. Abra el SQL Editor en Supabase Dashboard.
2. Ejecute el script [20260803_commercial_benefits_down.sql](file:///E:/RECURSOS/ANTIGRAVITY/Sovogin/supabase/migrations/20260803_commercial_benefits_down.sql).
3. Verifique que la tabla `public.commercial_benefits` y la función `set_commercial_benefits_updated_at` hayan sido eliminadas limpiamente.

---

## 🔒 9. Confirmación de Estado de la Fase 1

* **Tabla vacía**: La migración no inserta datos semilla.
* **Integridad**: No se han modificado ni eliminado registros ni objetos de `public.media_items` ni `auth.users`.
* **Cero cambios frontend**: No existen componentes ni rutas modificadas en `src/`.

# Runbook de Arquitectura: Módulo de Check-in de Inscripciones (SOVOGIN)

**Fecha:** 7 de agosto de 2026  
**Proyecto:** SOVOGIN CMS & Registrations System  
**Módulo:** Acreditación e Ingreso en Sitio (Check-in)  
**Estado:** Documentación e Instrucciones de Aplicación  

---

## 1. Descripción de la Funcionalidad

El módulo de **Check-in** permite al personal administrativo registrar el ingreso de los participantes a simposios y eventos presenciales de SOVOGIN, manteniendo una trazabilidad exacta del evento, fecha y hora de ingreso, y método utilizado (`manual`, `document`, `qr`).

### Reglas Clave:
1. **Fuente de Verdad:** `checked_in_at IS NOT NULL` determina si un participante ingresó (no se utiliza columna booleana redundante).
2. **Requisito de Confirmación:** Únicamente las inscripciones con `status = 'confirmed'` están habilitadas para realizar Check-in. Intentar acreditar a un participante en estado `pending` o `cancelled` desplegará una alerta explicativa en la interfaz.
3. **Idempotencia:** La función `checkInRegistration` verifica si `checked_in_at` ya está asignado antes de realizar actualizaciones para evitar sobrescrituras de hora original.
4. **Acción Deshacer:** Se proporciona la función `undoRegistrationCheckIn` con confirmación explícita para corregir ingresos erróneos.

---

## 2. Aplicación de la Migración en Supabase

> [!IMPORTANT]
> Los scripts SQL **NO** se ejecutan automáticamente por la aplicación. El administrador de la base de datos debe aplicar manualmente el archivo SQL en el editor SQL de Supabase o mediante la CLI.

### Pasos de Aplicación:
1. Abrir el panel de administración de Supabase en el proyecto de SOVOGIN.
2. Navegar a **SQL Editor**.
3. Copiar el contenido del archivo [`supabase/migrations/20260807_registration_checkin.sql`](file:///e:/RECURSOS/ANTIGRAVITY/Sovogin/supabase/migrations/20260807_registration_checkin.sql).
4. Ejecutar el script.

---

## 3. Procedimiento de Rollback (Reversión)

Si se requiere revertir el módulo de Check-in a nivel de base de datos:
1. Navegar al **SQL Editor** de Supabase.
2. Copiar el contenido del archivo [`supabase/migrations/20260807_registration_checkin_down.sql`](file:///e:/RECURSOS/ANTIGRAVITY/Sovogin/supabase/migrations/20260807_registration_checkin_down.sql).
3. Ejecutar el script.

---

## 4. RLS y Modelo de Seguridad
- Las políticas RLS existentes sobre `public.registrations` permiten las operaciones `UPDATE` administrativas.
- La función `checkInRegistration` utiliza el usuario autenticado (`auth.uid()`) obtenido mediante `supabase.auth.getUser()` para llenar la columna `checked_in_by`.
- Por motivos de privacidad y seguridad, las UUIDs internas de los usuarios administrativos (`checked_in_by`) **no se exponen públicamente** ni en los listados generales ni en las exportaciones a Excel/CSV.

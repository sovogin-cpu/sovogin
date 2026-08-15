# Runbook de Arquitectura: Acreditación y Check-In por QR (SOVOGIN)

**Fecha:** 8 de agosto de 2026  
**Proyecto:** SOVOGIN Payment & Registrations System  
**Módulo:** Acreditación y Check-in mediante Código QR  
**Estado:** Documentación de Arquitectura e Instrucciones de Aplicación  

---

## 1. Descripción del Flujo de Check-In con QR

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                   FLUJO DE ACREDITACIÓN Y CHECK-IN QR                       │
└─────────────────────────────────────────────────────────────────────────────┘
  1. El administrador visualiza o imprime la credencial QR desde /admin/inscritos.
     - Token criptográfico opaco generado server-side (SOV-CK-<64_hex_chars>).
     - La BD guarda únicamente el HASH SHA-256 (checkin_token_hash).
     - Ningún dato personal (nombre, cédula, email, UUID) se codifica en el QR.

  2. El operador en sitio abre /admin/check-in:
     - Selecciona el Evento Activo en la parte superior.
     - Activa la cámara (BarcodeDetector) o usa el campo de Código Manual.

  3. Al escanear o ingresar el token:
     - Se invoca POST /api/admin/check-in/scan { token, eventId }.
     - Se verifica autenticación Auth + rol 'admin' en el servidor.
     - Se calcula sha256(token) y se busca la inscripción.

  4. Validaciones de Negocio:
     - Inscripción existe: de lo contrario, "Código QR no válido".
     - Coincidencia de Evento: si event_id no coincide con el seleccionado,
       se muestra "Esta inscripción pertenece a otro evento" y NO se registra.
     - Estado confirmado: si status != 'confirmed', muestra "INSCRIPCIÓN PENDIENTE / CANCELADA".

  5. Idempotencia:
     - Si checked_in_at ya existía:
       Retorna already_checked_in = true con la fecha/hora original.
       NO sobrescribe checked_in_at.
     - Si nunca había ingresado:
       Actualiza checked_in_at = now(), checked_in_by = auth.uid(), check_in_method = 'qr'.
       Retorna resultado exitoso (✓ INGRESO REGISTRADO).
```

---

## 2. Definición del Modelo de Credencial Opaca

- **Token Plano (Cliente/QR):** Cadena de 71 caracteres con prefijo `SOV-CK-` y 64 caracteres hexadecimales (entropía de 256 bits).
- **Almacenamiento (Base de Datos):** Columna `checkin_token_hash` en `public.registrations` (almacena únicamente el hash SHA-256 en hexadecimal).
- **Privacidad Impecable:** Imposible reconstruir los datos del asistente desde el contenido del código QR.

---

## 3. Seguridad de los Route Handlers

- **Verificación de Rol Obligatoria:** Los endpoints `/api/admin/check-in/verify` y `/api/admin/check-in/scan` verifican:
  1. Sesión activa con Supabase Server Client.
  2. Valida la identidad del usuario (`auth.getUser()`).
  3. Verifica que el usuario sea administrador (consulta en `profiles.role` o función RPC `public.is_admin()`).
- **Respuesta Mínima Administrativa:** No se exponen tokens de Openpay, references de pago, ni datos financieros.

---

## 4. Aplicación Manual de las Migraciones SQL

> [!IMPORTANT]
> **NO** se ejecutan migraciones SQL automáticamente desde la aplicación.

### Orden de Aplicación en Supabase SQL Editor:
1. Ejecutar [`supabase/migrations/20260808_registration_qr_checkin.sql`](file:///e:/RECURSOS/ANTIGRAVITY/Sovogin/supabase/migrations/20260808_registration_qr_checkin.sql).

### Reversión (Rollback):
- Ejecutar [`supabase/migrations/20260808_registration_qr_checkin_down.sql`](file:///e:/RECURSOS/ANTIGRAVITY/Sovogin/supabase/migrations/20260808_registration_qr_checkin_down.sql).

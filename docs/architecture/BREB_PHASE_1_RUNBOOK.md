# Runbook de Arquitectura: Integración Bre-B - Fase 1 (SOVOGIN)

**Fecha:** 7 de agosto de 2026  
**Proyecto:** SOVOGIN Payment & Registrations System  
**Módulo:** Integración Bre-B (Banco de Bogotá MID) — Fase 1  
**Estado:** Documentación de Arquitectura e Instrucciones de Aplicación  

---

## 1. Descripción del Flujo de Conciliación Bre-B

El flujo de pago vía **Bre-B** soporta transferencias bancarias mediante el código QR del MID de SOVOGIN en el Banco de Bogotá, utilizando un mecanismo de **conciliación administrativa segura**:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FLUJO DE CONCILIACIÓN BRE-B                           │
└─────────────────────────────────────────────────────────────────────────────┘
  1. Usuario selecciona pago Bre-B en la vista pública del simposio.
  2. El sistema genera una orden de pago en payment_orders:
     - reference: SOV-BREB-{timestamp}-{hash_8}
     - payment_method: breb_qr
     - status: pending
  3. El usuario visualiza el QR + monto exacto + referencia SOVOGIN.
  4. El usuario realiza la transferencia desde su App bancaria y pulsa "Ya pagué".
  5. La orden cambia a status = pending_verification (breb_reported_at = now()).
  6. El Administrador verifica el extracto/comprobante en /admin/inscritos o /admin/pagos:
     
     ┌─────────────────────── APROBAR PAGO ──────────────────────┐
     │ - Verifica idempotencia (registration_id no asignado)      │
     │ - payment_orders.status = 'paid'                          │
     │ - paid_at = now(), breb_verified_at = now()                │
     │ - breb_verified_by = admin.id                              │
     │ - Registra en public.registrations:                       │
     │   * status = 'confirmed'                                  │
     │   * payment_status = 'paid'                               │
     │   * origin = 'breb'                                       │
     │ - Dispara envío de correo de confirmación de entrada.      │
     └───────────────────────────────────────────────────────────┘

     ┌─────────────────────── RECHAZAR PAGO ─────────────────────┐
     │ - payment_orders.status = 'cancelled'                     │
     │ - breb_rejection_reason = 'Comprobante no coincide...'     │
     │ - No se crea registro en public.registrations.            │
     └───────────────────────────────────────────────────────────┘
```

---

## 2. Definición Semántica de Estados de Rechazo (`cancelled` vs `failed`)

- **`cancelled` (Rechazado por Conciliación):** Se utiliza cuando un administrador revisa un comprobante reportado por el usuario y determina que el pago no fue recibido o no coincide. Refleja la cancelación administrativa de una solicitud.
- **`failed` (Falla Técnica de Pasarela):** Reservado para errores técnicos de comunicación automática en pasarelas (ej. tarjeta declinada en Openpay o timeout bancario).

---

## 3. Estrategia de Gestión del Código QR

> [!IMPORTANT]
> **No Hardcoding:** El código QR **NO** se almacenará como imagen física en `src/`, ni en base64 en la base de datos, ni mediante URLs firmadas expirables estáticas.

### Estrategia Seleccionada:
1. La imagen del QR se sube a la **Biblioteca Multimedia (`media_items`)** de SOVOGIN como un recurso público activo.
2. El administrador configura el `media_id` correspondiente al QR en la configuración general del sistema (`site_settings`).
3. El frontend público consulta dinámicamente el `media_id` del QR configurado para renderizar la vista de pago.

---

## 4. Modelo de Seguridad e Idempotencia

### A. Seguridad de Transacciones:
- **Cero Mutaciones Públicas Inseguras:** Los clientes públicos únicamente pueden crear la orden en estado `pending` y cambiar a `pending_verification`.
- **Protección de Aprobación:** La asignación de `status = 'paid'`, `paid_at`, `breb_verified_by` y la creación de la entrada en `registrations` ejecutan estrictamente en el servidor a través de Route Handlers con verificación de rol `admin`.
- **Aislamiento de Openpay:** Las órdenes de Openpay son inmunes a los flujos Bre-B.

### B. Idempotencia:
- Antes de procesar una aprobación, la función verifica si `payment_orders.registration_id` o `registrations.payment_order_id` ya existen. Si la inscripción ya fue creada previamente, la operación retorna el estado existente sin duplicar registros.

---

## 5. Aplicación Manual de las Migraciones SQL

> [!IMPORTANT]
> **NO** se ejecutan migraciones SQL automáticamente desde el código de la aplicación.

### Orden de Aplicación en el SQL Editor de Supabase:
1. Aplicar [`supabase/migrations/20260807_registrations_admin_rls.sql`](file:///e:/RECURSOS/ANTIGRAVITY/Sovogin/supabase/migrations/20260807_registrations_admin_rls.sql).
2. Aplicar [`supabase/migrations/20260807_breb_payment_orders.sql`](file:///e:/RECURSOS/ANTIGRAVITY/Sovogin/supabase/migrations/20260807_breb_payment_orders.sql).

### Scripts de Reversión (Rollback):
- [`supabase/migrations/20260807_registrations_admin_rls_down.sql`](file:///e:/RECURSOS/ANTIGRAVITY/Sovogin/supabase/migrations/20260807_registrations_admin_rls_down.sql).
- [`supabase/migrations/20260807_breb_payment_orders_down.sql`](file:///e:/RECURSOS/ANTIGRAVITY/Sovogin/supabase/migrations/20260807_breb_payment_orders_down.sql).

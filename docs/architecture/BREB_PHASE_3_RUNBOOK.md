# Runbook de Arquitectura: Integración Bre-B - Fase 3 (Conciliación Administrativa)

**Fecha:** 15 de agosto de 2026  
**Proyecto:** SOVOGIN Payment & Registrations System  
**Módulo:** Conciliación Administrativa Bre-B (Banco de Bogotá MID) — Fase 3  
**Estado:** Documentación de Arquitectura e Instrucciones de Aplicación Manual  

---

## 1. Descripción del Flujo de Conciliación Administrativa Bre-B

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   FLUJO TRANSACCIONAL DE CONCILIACIÓN BRE-B                       │
└──────────────────────────────────────────────────────────────────────────────────┘
  1. Asistente reporta transferencia en la vista pública -> status = 'pending_verification'.
  2. El administrador ingresa a /admin/pagos:
     - Visualiza órdenes de pago con filtros por Método (Bre-B/Openpay) y Estado.
     - Selecciona la orden Bre-B en 'pending_verification' y presiona "Revisar".

  3. APROBACIÓN ADMINISTRATIVA:
     - El administrador verifica en Banco de Bogotá el abono.
     - Presiona "Aprobar Pago Bre-B" e ingresa la referencia bancaria (opcional).
     - Invoca POST /api/admin/payments/breb/approve { orderId, brebTransactionReference }.
     - El servidor verifica autenticación Auth y rol profile.role = 'admin'.
     - Invoca la función RPC PostgreSQL: public.approve_breb_payment_order(p_order_id, p_admin_id, p_breb_ref).

  4. TRANSACCIÓN ACID POSTGRESQL (FOR UPDATE):
     - Bloquea la fila en payment_orders durante la consulta y mutación.
     - Valida idempotencia: Si status = 'paid' y registration_id IS NOT NULL, retorna éxito sin duplicar.
     - Inserta una fila en public.registrations con origin = 'breb', status = 'confirmed',
       payment_status = 'paid', y los valores reales de category y modality persistidos en la orden.
     - Actualiza public.payment_orders con status = 'paid', paid_at = NOW(),
       breb_verified_at = NOW(), breb_verified_by = admin_id, registration_id = new_reg.id.

  5. ENVÍO DE EMAIL DE ENTRADA:
     - Fuera de la transacción de DB, la Route Handler ejecuta sendPaymentConfirmationEmail().
     - Guarda confirmation_email_sent_at en payment_orders (de forma idempotente).

  6. RECHAZO ADMINISTRATIVO:
     - Si la transferencia no fue recibida o el comprobante es inválido, el admin presiona "Rechazar".
     - Ingresa el motivo (mínimo 5 caracteres).
     - Invoca POST /api/admin/payments/breb/reject -> RPC public.reject_breb_payment_order.
     - Actualiza status = 'cancelled', breb_rejection_reason = motivo, breb_verified_at = NOW().
     - NO crea registro en public.registrations.
```

---

## 2. Aplicación Manual de las Migraciones SQL

> [!IMPORTANT]
> **NO** se ejecutan migraciones SQL automáticamente desde la aplicación.

### Orden de Aplicación en Supabase SQL Editor:
1. Ejecutar [`supabase/migrations/20260810_approve_breb_rpc.sql`](file:///e:/RECURSOS/ANTIGRAVITY/Sovogin/supabase/migrations/20260810_approve_breb_rpc.sql).

### Scripts de Reversión (Rollback):
- Ejecutar [`supabase/migrations/20260810_approve_breb_rpc_down.sql`](file:///e:/RECURSOS/ANTIGRAVITY/Sovogin/supabase/migrations/20260810_approve_breb_rpc_down.sql).

---

## 3. Pruebas Manuales Recomendadas

### Caso 1: Aprobación Exitosa
1. Crear una orden Bre-B desde la vista pública del simposio y presionar "Ya realicé el pago" (`status = 'pending_verification'`).
2. Abrir `/admin/pagos`, presionar "Revisar" en la orden y pulsar "Aprobar Pago Bre-B".
3. Confirmar la aprobación.
4. Verificar que:
   - `payment_orders.status` cambie a `'paid'`.
   - `payment_orders.registration_id` obtenga el UUID de la nueva inscripción.
   - `registrations` contenga la fila confirmada con `origin = 'breb'` y la categoría/modalidad correctas.
   - La inscripción aparezca en `/admin/inscritos`.

### Caso 2: Prueba de Idempotencia (Doble Clic)
1. Invocar nuevamente la aprobación sobre la misma orden.
2. Confirmar que la API responda `alreadyPaid = true` sin duplicar filas en `registrations`.

### Caso 3: Rechazo
1. Seleccionar una orden en `pending_verification` y pulsar "Rechazar".
2. Ingresar el motivo (ej. "Transferencia no encontrada en extracto bancario").
3. Verificar que `payment_orders.status` cambie a `'cancelled'`, `breb_rejection_reason` guarde el motivo y NO se cree fila en `registrations`.

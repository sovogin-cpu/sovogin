# Diseño de Arquitectura: Pagos Bre-B, Registro Manual y Conciliación (SOVOGIN)

**Fecha:** 7 de agosto de 2026  
**Proyecto:** SOVOGIN Registrations & Payment Architecture  
**Estado:** Propuesta de Diseño (Sin ejecución de cambios en BD ni código)  

---

## 1. Visión General del Sistema Multicanal de Inscripciones

SOVOGIN requiere soportar tres flujos de inscripción coherentes y centralizados sobre la misma infraestructura de base de datos existente:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      CANALES DE INSCRIPCIÓN SOVOGIN                     │
└─────────────────────────────────────────────────────────────────────────┘
         │                                 │                             │
         ▼                                 ▼                             ▼
┌──────────────────┐             ┌──────────────────┐          ┌──────────────────┐
│  1. OPENPAY      │             │  2. BRE-B        │          │  3. ADMIN MANUAL │
│  (Pasarela Auto) │             │  (QR Banco Bog)  │          │  (/admin/inscritos)│
└──────────────────┘             └──────────────────┘          └──────────────────┘
         │                                 │                             │
         ▼                                 ▼                             ▼
  Pago Automático                  Conciliación Manual           Invitados / Cortesías
  Webhook Instantáneo              Verificación Admin            Ponentes / Patrocinadores
         │                                 │                             │
         └─────────────────────────┬───────┴─────────────────────────────┘
                                   ▼
                   ┌───────────────────────────────┐
                   │    TABLAS CORE SUPABASE       │
                   │  - public.payment_orders      │
                   │  - public.registrations       │
                   └───────────────────────────────┘
```

---

## 2. Flujo de Arquitectura: Pagos vía Bre-B (Banco de Bogotá MID)

### A. Contexto Bre-B:
- El pago se efectúa escaneando un código QR asignado al código MID de SOVOGIN en el Banco de Bogotá.
- El usuario realiza la transferencia desde su aplicación bancaria.
- El banco no notifica por webhook inmediato en la fase inicial, por lo cual se establece un flujo de **conciliación administrativa**.

### B. Diagrama de Secuencia Bre-B:

```text
Usuario                   Sistema SOVOGIN                   Administrador
  │                             │                                 │
  ├─ 1. Selecciona Evento ─────►│                                 │
  ├─ 2. Elige pago Bre-B ──────►│                                 │
  │                             ├─ 3. Crea payment_order          │
  │                             │     (ref: SOV-BREB-XXXX,        │
  │                             │      status: pending_verif)     │
  │◄─ 4. Muestra QR + Ref ──────┤                                 │
  │                             │                                 │
  │  [Usuario paga en su App]   │                                 │
  ├─ 5. Clic "Ya pagué" ───────►│                                 │
  │                             │                                 │
  │                             │◄─ 6. Revisa /admin/inscritos ───┤
  │                             │      o /admin/pagos             │
  │                             │                                 │
  │                             ├─ 7. Concilia comprobante/ref ───┤
  │                             │                                 │
  │                             │◄─ 8. Clic "Aprobar Pago Bre-B" ─┤
  │                             │                                 │
  │                             ├─ 9. payment_order = 'paid'     │
  │                             ├─ 10. Crea/Confirma            │
  │                             │      registration = 'confirmed'│
  │◄─ 11. Envía Email ──────────┴─ 12. registration_status=paid ┘
```

### C. Detalle Técnico de Datos Bre-B:

1. **Creación de Orden (`payment_orders`):**
   - `reference`: `SOV-BREB-{timestamp}-{hash_6}`
   - `product_type`: `'event'`
   - `product_id`: `event.id`
   - `payment_method`: `'breb_qr'`
   - `status`: `'pending_verification'`
   - `customer_*`: Datos ingresados por el asistente en el formulario web.

2. **Acción del Administrador (Aprobación Manual):**
   - En `/admin/inscritos` o `/admin/pagos`, el administrador ubica la referencia `SOV-BREB-...`.
   - Al pulsar **"Aprobar Pago Bre-B"**:
     - Se actualiza `payment_orders.status = 'paid'`, `paid_at = now()`.
     - Se inserta en `registrations`:
       - `status`: `'confirmed'`
       - `payment_status`: `'paid'`
       - `origin`: `'breb'`
       - `payment_order_id`: `order.id`
       - `payment_reference`: `order.reference`
     - Se gatilla `sendPaymentConfirmationEmail(...)` notificando al usuario su entrada confirmada.

---

## 3. Flujo de Arquitectura: Registro Manual desde `/admin/inscritos`

Permite inscribir directamente participantes sin cobro o con comprobante físico:

### A. Tipos de Registro Soportados:
- **Invitados Especiales** (`origin: 'invited'`)
- **Cortesías** (`origin: 'courtesy'`)
- **Ponentes / Conferencistas** (`origin: 'speaker'`)
- **Patrocinadores** (`origin: 'sponsor'`)
- **Registro Administrativo Manual** (`origin: 'admin_manual'`)

### B. Mapeo de Campos en `public.registrations`:

```ts
const manualRegistrationPayload = {
  event_id: selectedEventId,
  full_name: fullName.trim(),
  email: email.trim().toLowerCase(),
  phone: phone || null,
  customer_document_type: documentType, // 'CC', 'CE', 'PASAPORTE'
  document_number: documentNumber.trim(),
  amount: origin === 'courtesy' || origin === 'invited' || origin === 'speaker' ? 0 : amount,
  modality: modality, // 'presencial', 'virtual'
  category: categoryLabel, // 'Invitado', 'Ponente', 'Cortesía', etc.
  status: 'confirmed',
  payment_status: origin === 'courtesy' || origin === 'invited' || origin === 'speaker' ? 'not_required' : 'paid',
  origin: origin, // 'invited', 'courtesy', 'speaker', 'sponsor', 'admin_manual'
  paid_at: new Date().toISOString(),
};
```

---

## 4. Garantías de Idempotencia y Controles de Seguridad

### A. Idempotencia:
1. **Restricción Unique:** Las columnas `payment_order_id` y `payment_reference` en `registrations` garantizan a nivel de base de datos que ninguna orden genere dos inscripciones.
2. **Control de Doble Aprobación Bre-B:** Antes de procesar una aprobación en `/admin/inscritos`, se verifica si `order.status === 'paid'` o si existe `registrations` vinculada a la referencia.

### B. Seguridad:
1. **Enmascaramiento de Documentos:** En la interfaz administrativa los números de documento se muestran parcializados (ej: `CC - *****1234`).
2. **Service Role Scoping:** Operaciones administrativas de aprobación o creación manual ejecutan consultas server-side seguras a través de `supabaseAdmin`.
3. **Validación de Datos:** Los emails se convierten a minúsculas y las URLs de redirección se evalúan estrictamente.

---

## 5. Diseño Recomendado para la Interfaz `/admin/inscritos`

### A. Barra de Filtros Avanzada:
- **Filtro por Evento:** Select con la lista de eventos activos.
- **Filtro por Estado de Inscripción:** `Todos`, `Confirmado`, `Pendiente`, `Cancelado`.
- **Filtro por Estado de Pago:** `Todos`, `Pagado`, `Pendiente Verificación (Bre-B)`, `No Requerido`.
- **Filtro por Origen:** `Todos`, `Openpay`, `Bre-B`, `Invitado`, `Cortesía`, `Ponente`, `Patrocinador`, `Manual`.

### B. Badges Visuales Diferenciadas:
- `Openpay`: Badge Azul con ícono de Tarjeta.
- `Bre-B`: Badge Violeta con ícono de QR/Transferencia.
- `Invitado / Cortesía`: Badge Esmeralda con ícono de Regalo/Estrella.
- `Ponente / Patrocinador`: Badge Ámbar con ícono de Medalla.

---

## 6. Roadmap de Implementación por Fases (Para Sprints Futuros)

### Fase 1: Creación de Componente Modal de Registro Manual en `/admin/inscritos`
- Construcción del formulario de registro manual con selector de evento, origen (`invited`, `courtesy`, `speaker`, `sponsor`, `admin_manual`), modalidad y montos.

### Fase 2: Módulo de Conciliación Bre-B en Admin
- Botón de aprobación "Confirmar Pago Bre-B" en órdenes pendientes con generación automática de inscripción y correo de notificación.

### Fase 3: Vista Web Pública de Selección de Pago (Openpay vs Bre-B)
- Integración en `/simposios/[id]/registro` de la opción de pago por QR Bre-B con generación de referencia `SOV-BREB-...` e instrucciones claras para el asistente.

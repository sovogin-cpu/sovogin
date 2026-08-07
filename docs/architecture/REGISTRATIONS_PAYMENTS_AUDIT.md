# Auditoría Técnica: Inscripciones, Eventos y Pagos (SOVOGIN)

**Fecha de Auditoría:** 7 de agosto de 2026  
**Rama:** `feature/content-admin-framework`  
**Proyecto:** SOVOGIN Content CMS & Registrations System  

---

## 1. Inspección Real de Base de Datos y Esquemas

La inspección del código fuente y los archivos de migración (`supabase_schema.sql` y `src/app/admin/fix_openpay_registrations_schema.sql`) confirma la estructura real de las tablas relacionadas con inscripciones y pagos en Supabase:

### A. Tabla `public.registrations`
Almacena el registro individual de asistencia/inscripción de una persona a un evento.

| Columna | Tipo de Dato | Restricciones / Valores Reales | Descripción / Uso en Código |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Identificador único de la inscripción |
| `user_id` | `UUID` | `REFERENCES public.profiles(id)`, Opcional | Vínculo con usuario autenticado (si aplica) |
| `event_id` | `UUID` | `REFERENCES public.events(id)`, Opcional | Evento en el cual se inscribe |
| `full_name` | `TEXT` | Requerido en inscripciones | Nombre completo del participante |
| `email` | `TEXT` | Requerido en inscripciones | Correo electrónico del participante |
| `phone` | `TEXT` | Opcional | Teléfono de contacto |
| `customer_document_type` | `TEXT` | Defecto `'CC'` | Tipo de documento (`CC`, `CE`, `PASAPORTE`, etc.) |
| `document_number` | `TEXT` | Requerido en inscripciones | Número de documento |
| `amount` | `NUMERIC/DECIMAL` | Requerido | Monto pagado o registrado ($0 en cortesías) |
| `modality` | `TEXT` | Defecto `'presencial'` | Modalidad de asistencia |
| `category` | `TEXT` | Ej: `'Participante Openpay'` | Categoría del participante |
| `status` | `TEXT` | CHECK (`'pending'`, `'confirmed'`, `'cancelled'`) | Estado del registro de asistencia |
| `payment_status` | `TEXT` | Ej: `'paid'`, `'pending'`, `'not_required'` | Estado financiero del pago |
| `payment_id` | `TEXT` | Opcional | ID de transacción de la pasarela |
| `payment_order_id` | `UUID` | `REFERENCES public.payment_orders(id)`, `UNIQUE` | Vínculo 1:1 con la orden de pago |
| `payment_reference` | `TEXT` | `UNIQUE` | Referencia alfanumérica única (`SOV-...`) |
| `openpay_transaction_id`| `TEXT` | Opcional | ID de transacción de Openpay |
| `authorization_code` | `TEXT` | Opcional | Código de autorización bancaria |
| `paid_at` | `TIMESTAMPTZ` | Opcional | Fecha y hora en que se confirmó el pago |
| `origin` | `TEXT` | Defecto `'openpay'` | Origen del registro (`'openpay'`, `'manual'`, etc.) |
| `created_at` | `TIMESTAMPTZ` | Default `now()` | Fecha de creación del registro |

---

### B. Tabla `public.payment_orders`
Almacena la intención y el historial de transacciones procesadas por la pasarela de pagos.

| Columna | Tipo de Dato | Restricciones / Valores Reales | Descripción / Uso en Código |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Identificador único de la orden |
| `reference` | `TEXT` | `UNIQUE`, Formato `SOV-{timestamp}-{hash}` | Referencia pública de pago |
| `product_type` | `TEXT` | Ej: `'event'` | Tipo de producto comprado |
| `product_id` | `UUID` | FK a `events.id` | ID del evento comprado |
| `product_name` | `TEXT` | Nombre del evento al momento de pagar | Título del evento |
| `customer_name` | `TEXT` | Nombre del comprador | Nombres del pagador |
| `customer_last_name` | `TEXT` | Apellidos del comprador | Apellidos del pagador |
| `customer_email` | `TEXT` | Email del comprador | Correo de notificación y factura |
| `customer_phone` | `TEXT` | Opcional | Teléfono del comprador |
| `customer_document_type` | `TEXT` | Ej: `'CC'` | Tipo de documento del pagador |
| `customer_document_number`| `TEXT` | Número de documento | Documento del pagador |
| `amount` | `NUMERIC/DECIMAL` | Requerido | Valor a cobrar en COP |
| `currency` | `TEXT` | Defecto `'COP'` | Moneda de la transacción |
| `status` | `TEXT` | Ej: `'pending'`, `'paid'`, `'failed'`, `'cancelled'` | Estado del cobro |
| `openpay_transaction_id`| `TEXT` | Opcional | ID asignado por Openpay |
| `openpay_status` | `TEXT` | Opcional | Estado crudo reportado por Openpay |
| `authorization_code` | `TEXT` | Opcional | Código de aprobación bancaria |
| `payment_method` | `TEXT` | Ej: `'card'`, `'bank_account'` | Método de pago utilizado |
| `raw_webhook_response` | `JSONB` | Opcional | Payload completo recibido en el Webhook |
| `paid_at` | `TIMESTAMPTZ` | Opcional | Fecha/hora del pago confirmado |
| `registration_id` | `UUID` | `REFERENCES public.registrations(id)` | Vínculo con la inscripción generada |
| `registration_created_at`| `TIMESTAMPTZ` | Opcional | Timestamp de creación de la inscripción |
| `confirmation_email_sent_at`| `TIMESTAMPTZ` | Opcional | Timestamp del envío de email de confirmación |
| `confirmation_email_error`| `TEXT` | Opcional | Error en caso de falla en envío de email |
| `created_at` | `TIMESTAMPTZ` | Default `now()` | Fecha de creación de la orden |
| `updated_at` | `TIMESTAMPTZ` | Default `now()` | Fecha de última actualización |

---

### C. Tabla `public.events`
Representa los simposios, congresos o eventos organizados por SOVOGIN.

| Columna | Tipo de Dato | Restricciones / Valores Reales | Descripción / Uso en Código |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Identificador único del evento |
| `title` | `TEXT` | Requerido | Título del evento |
| `description` | `TEXT` | Opcional | Descripción detallada |
| `date` | `TIMESTAMPTZ` | Opcional | Fecha y hora de realización |
| `location` | `TEXT` | Opcional | Lugar o sede del evento |
| `image_url` | `TEXT` | Opcional | Banner o imagen promocional |
| `price` | `DECIMAL(12,2)`| Defecto `0.00` | Valor comercial de la inscripción |
| `is_active` | `BOOLEAN` | Defecto `true` | Estado activo/inactivo |
| `created_at` | `TIMESTAMPTZ` | Default `now()` | Fecha de registro |

---

## 2. Auditoría del Módulo Administrativo `/admin/inscritos`

Ubicación: [`src/app/admin/inscritos/page.tsx`](file:///e:/RECURSOS/ANTIGRAVITY/Sovogin/src/app/admin/inscritos/page.tsx)

### Diagnóstico Técnico:
1. **Consulta de Datos:** Realiza un `select('*, events(title)')` sobre la tabla `registrations`, ordenado descendentemente por `created_at`.
2. **Columnas Presentadas en Tabla:**
   - Participante: `full_name`, `email`, `document_number` (enmascarado mostrando sólo los últimos 4 dígitos mediante `maskDocument`).
   - Evento: `events.title`.
   - Modalidad / Origen: `modality` (ej: presencial) y badge del `origin` (`Openpay` si `origin === 'openpay'`, o `Manual` si es nulo u otro).
   - Monto / Referencia: `amount` formateado en COP y `payment_reference`.
   - Estado: Mapeado combinado: muestra `Confirmado` (icono verde) si `status === 'confirmed' || payment_status === 'paid'`, `Pendiente` (icono amarillo) si `status === 'pending'`, o `Cancelado` (icono rojo) de lo contrario.
   - Acciones: Botón de eliminación directa (`deleteRegistration(id)`).
3. **Filtros de Búsqueda:** Búsqueda local por texto filtrando en tiempo real por `full_name`, `email`, `events.title` y `payment_reference`.
4. **Exportación:** Genera un archivo Excel `.xlsx` formateado mediante la librería `xlsx`.
5. **Gaps Detectados en la Interfaz Actual:**
   - ❌ **Sin Formulario de Creación Manual:** No existe modal ni formulario para registrar inscritos manuales, invitados, cortesías o participantes de Bre-B.
   - ❌ **Sin Edición de Inscritos:** No permite modificar datos del participante ni cambiar estados de pago/inscripción.
   - ❌ **Sin Filtro por Estado u Origen:** La vista sólo posee una barra de búsqueda general por texto.

---

## 3. Auditoría del Flujo Transaccional de Openpay

### A. Creación de Orden (`/api/payments/openpay/create/route.ts`)
1. El cliente envía la solicitud con los datos del participante y del evento.
2. Se genera una referencia única: `SOV-{timestamp}-{hash_8}`.
3. Se inserta un registro en `payment_orders` con `status: 'pending'`.
4. Se crea la sesión de cobro/checkout en Openpay y se retorna la URL o los datos de pago al usuario.

### B. Confirmación por Webhook (`/api/webhooks/openpay/route.ts`)
1. Openpay notifica el evento `verification` o `charge.completed`.
2. Se actualiza `payment_orders` asignando `status: 'paid'`, `paid_at`, `openpay_transaction_id` y `authorization_code`.
3. **Garantía de Idempotencia:**
   - Se consulta `registrations` filtrando por `payment_order_id = order.id` o `payment_reference = order.reference`.
   - Si la inscripción **ya existe**, se omite la creación duplicada y se vincula `registration_id` en `payment_orders`.
   - Si **no existe**, se inserta una nueva fila en `registrations` con:
     - `status: 'confirmed'`
     - `payment_status: 'paid'`
     - `origin: 'openpay'`
     - `amount: order.amount`
     - `payment_order_id: order.id`
     - `payment_reference: order.reference`
4. Se dispara el envío del correo de confirmación a través de Resend (`sendPaymentConfirmationEmail`) y se marca `confirmation_email_sent_at`.

---

## 4. Estado de Campos Existentes vs. Requerimientos

| Campo | Estado Actual en DB | Uso Actual | Adaptabilidad para Bre-B y Manuales |
| :--- | :--- | :--- | :--- |
| `origin` | **Existe** en `registrations` | Almacena `'openpay'`, en UI muestra `'openpay'` o `'Manual'` | Puede recibir `'breb'`, `'invited'`, `'courtesy'`, `'speaker'`, `'sponsor'`, `'admin_manual'` |
| `payment_status` | **Existe** en `registrations` y `payment_orders` | Almacena `'paid'`, `'pending'` | Puede recibir `'pending_verification'`, `'not_required'`, `'failed'` |
| `status` | **Existe** en `registrations` | Almacena `'pending'`, `'confirmed'`, `'cancelled'` | Separa adecuadamente el estado de la inscripción del estado del pago |
| `payment_reference` | **Existe** en `registrations` y `payment_orders` | Almacena `SOV-177...` | Puede almacenar referencias Bre-B `SOV-BREB-...` |
| `payment_method` | **Existe** en `payment_orders` | Almacena `'card'`, `'bank_account'` | Puede recibir `'breb_qr'`, `'cash'`, `'courtesy'` |

---

## 5. Matriz de Separación Conceptual

El análisis confirma que la arquitectura actual posee los pilares necesarios para separar limpiamente las tres dimensiones sin romper el código actual:

1. **Estado de Inscripción (`status`):**
   - `pending`: En proceso de verificación o pago.
   - `confirmed`: Cupo asegurado y participante autorizado.
   - `cancelled`: Inscripción anulada.

2. **Estado de Pago (`payment_status`):**
   - `not_required`: Cortesías, invitados, ponentes, patrocinadores.
   - `pending`: Esperando transacción automática.
   - `pending_verification`: Pago realizado vía QR Bre-B pendiente de conciliación.
   - `paid`: Pago verificado y recibido en cuenta.
   - `failed`: Transacción rechazada.

3. **Origen (`origin`):**
   - `openpay`: Pasarela automática.
   - `breb`: QR Banco de Bogotá (conciliación manual).
   - `invited`: Invitado especial.
   - `courtesy`: Inscripción de cortesía.
   - `speaker`: Conferencista / Ponente.
   - `sponsor`: Cupo comercial de patrocinador.
   - `admin_manual`: Registro administrativo directo.

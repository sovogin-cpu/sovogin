# Auditoría del Sistema Actual - SOVOGIN

**Fecha:** 3 de agosto de 2026  
**Proyecto:** SOVOGIN (Plataforma Académica e Institucional para Asociación Médica)  
**Alcance:** Diagnóstico del estado actual de la arquitectura, módulos, esquema de base de datos, almacenamiento y patrones de código.

---

## 1. Stack Tecnológico Detectado

| Capa | Tecnología / Librería | Versión en `package.json` |
| :--- | :--- | :--- |
| **Framework Web** | Next.js (App Router) | `16.2.4` |
| **Librería UI / Renderizado** | React / React DOM | `19.2.4` |
| **Lenguaje** | TypeScript | `^5` |
| **Estilos CSS** | Tailwind CSS | `^4` (con `@tailwindcss/postcss`) |
| **Componentes Base / Animación** | Lucide React, Framer Motion, Base UI, Tw-Animate-CSS, Shadcn | Var. |
| **Backend & Base de Datos** | Supabase (Database PostgreSQL) | Client `^2.105.1`, SSR `^0.10.2` |
| **Autenticación** | Supabase Auth | - |
| **Almacenamiento** | Supabase Storage | 5 buckets independientes |
| **Pasarela de Pagos** | Openpay (Integración personalizada via Webhooks & API) | HTTP Client REST |
| **IA / Chatbot** | Google Gemini API (`@google/generative-ai`) | `^0.24.1` |
| **Servicios de Email** | Resend | `^6.12.2` |
| **Utilidades de Procesamiento** | CryptoJS, Date-fns, XLSX | Var. |

---

## 2. Árbol Resumido del Proyecto

```text
E:\RECURSOS\ANTIGRAVITY\Sovogin
├── package.json
├── supabase_schema.sql
├── src
│   ├── app
│   │   ├── admin                      # Rutas administrativas protegidas
│   │   │   ├── actualizar-password
│   │   │   ├── banners                # Gestión de carrusel/banners
│   │   │   ├── beneficios             # Gestión de beneficios de asociación
│   │   │   ├── chatbot                # Gestión de base de conocimiento IA
│   │   │   ├── config                 # Configuración general del sitio
│   │   │   ├── eventos                # Gestión de simposios y transmisiones en vivo
│   │   │   ├── inscritos              # Gestión de asistentes/inscritos a eventos
│   │   │   ├── junta                  # Gestión de miembros de junta directiva
│   │   │   ├── login                  # Autenticación de administradores
│   │   │   ├── miembros               # Gestión de asociados médicos
│   │   │   ├── recuperar-password
│   │   │   ├── recursos               # Gestión de biblioteca de recursos/documentos
│   │   │   ├── sponsors               # Gestión de patrocinadores
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx               # Dashboard administrativo principal
│   │   ├── api                        # API Routes
│   │   │   ├── chat                   # Endpoint de IA Gemini
│   │   │   ├── payments/openpay       # Endpoints de creación y consulta de pagos
│   │   │   └── webhooks/openpay       # Webhook de procesamiento de confirmaciones Openpay
│   │   ├── asociacion                 # Página pública institucional y junta
│   │   ├── asociarse                  # Formulario público de solicitud de membresía
│   │   ├── contacto                   # Página pública de contacto
│   │   ├── eventos/live/[id]          # Transmisión en vivo para miembros
│   │   ├── pago                       # Resultado y confirmación de pagos
│   │   ├── pagos                      # Proceso de pago directo
│   │   ├── recursos                   # Catálogo público de documentos y descargas
│   │   ├── simposios                  # Catálogo de eventos públicos y registro
│   │   ├── layout.tsx
│   │   └── page.tsx                   # Landing page pública
│   ├── components
│   │   ├── admin                      # Layouts y barras laterales administrativas
│   │   ├── banners                    # Carrusel de eventos (EventHeaderCarousel)
│   │   ├── chat                       # Widget flotante de chatbot IA
│   │   ├── home                       # Secciones principales de la landing
│   │   ├── layout                     # Navbar y Footer
│   │   ├── payments                   # Formularios de pago Openpay
│   │   ├── ui                         # Componentes atómicos (Button, Input, Textarea, Modal)
│   │   ├── EventHeaderCarousel.tsx
│   │   └── MemberVerificationModal.tsx
│   ├── lib                            # Utilidades de email, utilidades de clases Tailwind
│   ├── proxy.ts                       # Punto de entrada de Middleware Next.js 16
│   └── utils
│       └── supabase                   # Clientes Browser, Server y Proxy Session
```

---

## 3. Módulos Actuales del Sistema

1. **Eventos / Simposios**: Gestión de conferencias, fechas, capacidad, costos, imagen representativa y transmisiones en vivo (`event_lives`).
2. **Inscritos y Registros**: Registro de participantes en eventos, vinculación con órdenes de pago Openpay y estado de asistencia.
3. **Transmisiones en Vivo (`event_lives`)**: Enlaces a streamings restringidos para asociados verificados.
4. **Miembros Asociados (`associates`)**: Padrón de médicos asociados con verificación de cédula/documento e inactividad.
5. **Recursos Académicos (`resources`)**: Documentos descargables (PDF, Word, PPT), enlaces externos y videos instructivos.
6. **Chatbot de Soporte (`chatbot_knowledge` / `chatbot_conversations`)**: Motor RAG ligero conectado a Gemini API para resolver dudas frecuentes.
7. **Junta Directiva (`board_members`)**: Perfiles de la directiva institucional con foto, cargo y orden de aparición.
8. **Beneficios Institucionales (`association_benefits`)**: Lista de beneficios gremiales con iconos personalizables.
9. **Patrocinadores (`sponsors`)**: Empresas aliadas clasificadas por nivel (Oro, Plata, Bronce) con logos y enlaces.
10. **Banners de Encabezado (`banners`)**: Imágenes publicitarias y promocionales con vigencia programada (`starts_at`, `ends_at`).
11. **Configuración del Sitio (`site_settings`)**: Claves/valores globales de la plataforma.
12. **Pagos Openpay (`payment_orders`)**: Procesamiento de pagos con tarjetas/PSE, generación de referencias e idempotencia mediante Webhooks.
13. **Autenticación & Perfiles (`profiles` / Supabase Auth)**: Control de sesiones administrativas y verificación de rol.

---

## 4. Tablas Detectadas en el Proyecto

A partir de `supabase_schema.sql`, scripts SQL de migración y consultas `.from('...')` en el código fuente, se identificaron 15 tablas:

| Tabla | Propósito Principal | Clave Primaria | Campos Clave Relacionados con Archivos/URLs |
| :--- | :--- | :--- | :--- |
| `public.profiles` | Perfiles de usuario vinculados a `auth.users` | UUID | `avatar_url` |
| `public.events` | Eventos y simposios académicos | UUID | `image_url`, `live_url` |
| `public.event_lives` | Datos de transmisiones en vivo de eventos | UUID | `banner_url` |
| `public.event_attendees` | Asistencia en tiempo real a vivos | UUID | - |
| `public.registrations` | Inscripciones a eventos | UUID | `payment_reference`, `openpay_transaction_id` |
| `public.payment_orders` | Órdenes de pago procesadas con Openpay | UUID | - |
| `public.associates` | Registro de miembros asociados | UUID | - |
| `public.resources` | Material académico y publicaciones | UUID | `file_url`, `resource_type`, `format` |
| `public.association_benefits` | Beneficios gremiales | UUID | `icon` |
| `public.sponsors` | Empresas patrocinadoras | UUID | `logo_url` |
| `public.board_members` | Miembros de la Junta Directiva | UUID | `image_url` |
| `public.banners` | Carrusel promocional dinámico | UUID | `image_url` |
| `public.site_settings` | Parámetros globales de configuración | UUID / Text | - |
| `public.chatbot_knowledge` | Base de datos de conocimiento para el Chatbot | UUID | - |
| `public.chatbot_conversations` | Historial de conversaciones del Chatbot | UUID | - |

---

## 5. Buckets de Almacenamiento Detectados (Supabase Storage)

Se detectaron **5 buckets** independientes en uso directo desde componentes cliente administrativos:

1. `event-images`: Almacena imágenes de portada de eventos e imágenes de banners para vivos (`banners/filename`).
2. `banners`: Almacena las imágenes promocionales del carrusel superior (`YYYY/uuid.ext`).
3. `resources`: Almacena documentos PDF/Word/PPT e imágenes adjuntas a recursos (`filename.ext`).
4. `sponsors`: Almacena logos de empresas patrocinadoras (`random.ext`).
5. `board-members`: Almacena fotos de la junta directiva (`random.ext`).

---

## 6. Patrones de Acceso a Supabase

- **Browser Client (`src/utils/supabase/client.ts`)**: Crea un cliente con `createBrowserClient` usando variables de entorno públicas. Es el patrón predominante utilizado directamente dentro de los componentes cliente con `"use client"`.
- **Server Client (`src/utils/supabase/server.ts`)**: Crea un cliente con `createServerClient` consumiendo cookies mediante `next/headers`.
- **Proxy Middleware (`src/utils/supabase/proxy.ts` / `src/proxy.ts`)**: Utiliza `updateSession` en cada petición HTTP para mantener refrescada la sesión de Supabase Auth en las cookies y proteger la ruta `/admin`.

---

## 7. Lógica Repetida y Código Redundante

1. **Subida de Archivos Inline e Inconsistente**:
   Cada página administrativa (`admin/banners`, `admin/eventos`, `admin/recursos`, `admin/sponsors`, `admin/junta`) implementa su propia función `uploadFile` / `uploadImage`.
2. **Generación de Nombres de Archivo**:
   - `admin/banners` usa `crypto.randomUUID()` con subcarpetas por año.
   - `admin/recursos`, `admin/sponsors` y `admin/junta` usan `Math.random()`, lo que genera nombres inseguros y propensos a colisiones no semánticas.
3. **Ausencia de Registro Centralizado de Archivos**:
   No existe una tabla que registre los metadatos del archivo subido (tamaño, tipo MIME, usuario que lo subió, nombre original, dimensiones). Las URLs públicas se guardan como cadenas de texto directamente en las tablas finales (`events.image_url`, `sponsors.logo_url`, etc.).
4. **Duplicación de Archivos en Storage**:
   Si dos eventos o sponsors usan el mismo logo, el usuario se ve obligado a subir el archivo dos veces, duplicando espacio ocupado.
5. **Archivos Huérfanos**:
   Al eliminar o actualizar un registro en la base de datos (por ejemplo, cambiar la foto de un miembro de junta), el archivo anterior no se borra de Supabase Storage.

---

## 8. Riesgos Técnicos e Inconsistencias

1. **Protección de Rutas en Middleware vs. RLS**:
   `src/utils/supabase/proxy.ts` únicamente verifica si `user` existe en la sesión para permitir acceso a la ruta `/admin`. No valida que el rol en `public.profiles` sea `'admin'`. Si un usuario registrado estándar inicia sesión, puede navegar visualmente al panel administrativo (aunque RLS en la base de datos bloquearía las mutaciones si RLS está bien configurado).
2. **Ausencia de Control de Duplicados o Hash de Archivos**:
   Subir múltiples veces el mismo PDF o imagen genera almacenamiento duplicado redundante.
3. **Nombres con `Math.random()`**:
   La generación de nombres mediante `Math.random()` carece de suficiencia trópica y puede sobreescribir archivos si colisionan nombres.

---

## 9. Archivos Críticos que NO Deben Modificarse Sin Pruebas

- [src/proxy.ts](file:///E:/RECURSOS/ANTIGRAVITY/Sovogin/src/proxy.ts) / [src/utils/supabase/proxy.ts](file:///E:/RECURSOS/ANTIGRAVITY/Sovogin/src/utils/supabase/proxy.ts): Manejo central de cookies y sesiones.
- [src/utils/supabase/client.ts](file:///E:/RECURSOS/ANTIGRAVITY/Sovogin/src/utils/supabase/client.ts) y [server.ts](file:///E:/RECURSOS/ANTIGRAVITY/Sovogin/src/utils/supabase/server.ts): Clientes globales de Supabase.
- [src/app/api/webhooks/openpay/route.ts](file:///E:/RECURSOS/ANTIGRAVITY/Sovogin/src/app/api/webhooks/openpay/route.ts): Webhook crítico para la conciliación de pagos e inscripciones.
- [src/components/MemberVerificationModal.tsx](file:///E:/RECURSOS/ANTIGRAVITY/Sovogin/src/components/MemberVerificationModal.tsx): Control de acceso a transmisiones privadas en vivo.

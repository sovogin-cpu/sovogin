# Límites y Responsabilidades de Módulos - SOVOGIN

**Fecha:** 3 de agosto de 2026  
**Objetivo:** Establecer fronteras claras entre módulos para evitar acoplamiento rígido y dependencias circulares.

---

## 1. Mapa de Responsabilidades por Módulo

| Módulo | Responsabilidad Principal | Tablas Asociadas | Servicios / Integraciones | Componentes Compartidos |
| :--- | :--- | :--- | :--- | :--- |
| **Media Library (Nuevo)** | Gestión centralizada de archivos multimedia, metadatos, categorías y deduplicación. | `media_items`, `media_categories`, `media_tags`, `media_item_tags` | Supabase Storage (`media` bucket), Hash Crypto | `MediaSelectorModal`, `MediaUploader`, `MediaGrid` |
| **Eventos / Simposios** | Programación académica, conferencias, costos, capacidad e imágenes informativas. | `events`, `event_lives`, `event_attendees` | Supabase DB, Media Library (opcional) | `EventCard`, `EventHeaderCarousel` |
| **Inscritos & Registro** | Registro de participantes en eventos y conciliación de asistencia. | `registrations`, `associates` (para descuento) | Supabase DB, Openpay API, Resend Email | `MemberVerificationModal` |
| **Pagos (Openpay)** | Procesamiento de pagos con tarjeta/PSE, estado de transacciones y webhooks. | `payment_orders`, `registrations` | Openpay REST API, Webhooks Handler, Resend | `OpenpayRegistrationForm` |
| **Asociados / Miembros** | Padrón de médicos miembros, verificación de identidad y estado activo/inactivo. | `associates`, `profiles` | Supabase DB | `MemberVerificationModal` |
| **Recursos Académicos** | Repositorio de documentos, guías clínicas, videos y enlaces externos. | `resources` | Supabase Storage (`resources`), Media Library | `ResourceCard`, `CategoryFilter` |
| **Chatbot IA** | Asistente virtual para responder preguntas sobre la asociación y simposios. | `chatbot_knowledge`, `chatbot_conversations` | Google Gemini API (`@google/generative-ai`) | `ChatbotWidget` |
| **Junta Directiva** | Presentación institucional de los miembros del consejo directivo. | `board_members` | Supabase DB | `BoardMemberCard` |
| **Beneficios** | Presentación de beneficios gremiales para asociados. | `association_benefits` | Supabase DB | `BenefitIconList` |
| **Patrocinadores** | Logos e información de empresas aliadas y niveles de patrocinio. | `sponsors` | Supabase DB | `SponsorLogoGrid` |
| **Banners** | Carrusel promocional programado temporalmente en encabezados. | `banners` | Supabase DB | `EventHeaderCarousel` |
| **Configuración** | Variables dinámicas y metadatos del sitio web. | `site_settings` | Supabase DB | - |

---

## 2. Reglas de Acoplamiento y Dependencias Prohibidas

Para mantener la arquitectura limpia y prevenir ciclos de dependencia:

1. **Media Library no debe depender de ningún módulo de negocio**:
   - `Media Library` es un módulo transversal de soporte. **NO** debe importar tipos ni componentes de `Eventos`, `Banners`, `Patrocinadores` ni `Recursos`.
2. **Banners no debe depender de Eventos**:
   - El módulo de `Banners` gestiona imágenes y enlaces genéricos. Si un banner apunta a un evento, guarda únicamente un `link_url` como string, sin FK dura que restrinja su funcionamiento.
3. **Recursos no debe depender de Junta Directiva ni de Eventos**:
   - Los recursos académicos son entidades autónomas.
4. **Patrocinadores y Beneficios son módulos aislados de presentación**:
   - No deben estar acoplados a transacciones ni usuarios específicos.
5. **Módulos de Negocio hacia Media Library (Unidireccional)**:
   - Los módulos (Eventos, Banners, Patrocinadores, etc.) pueden consumir opcionalmente la `Media Library` mediante referencias por ID (`media_id`) o URL pública (`image_url`).

---

## 3. Matriz de Invocaciones Permitidas

```text
[Eventos / Banners / Patrocinadores / Recursos / Junta]
                         │
                         ▼ (Solo lectura/selección de URLs o Media IDs)
                 [Media Library]
                         │
                         ▼ (Almacenamiento físico y metadatos)
            [Supabase Storage & PostgreSQL]
```

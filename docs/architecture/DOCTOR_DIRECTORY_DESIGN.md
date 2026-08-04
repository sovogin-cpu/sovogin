# Diseño Técnico y de Privacidad: Directorio Médico Público

**Fecha:** 3 de agosto de 2026  
**Módulo:** Doctor Directory (`src/modules/directory` / `/comunidad/directorio`)  
**Rama:** `feature/content-cms-core`

---

## 1. Propósito y Límites de Privacidad

SOVOGIN requiere ofrecer un **Directorio Médico Público** de libre acceso en la sección `/comunidad/directorio` para que pacientes y usuarios puedan encontrar especialistas en ginecología y obstetricia pertenecientes a la asociación.

### Principio de Privacidad Cero Fuga de Datos:
La tabla `associates` contiene información privada sensible (número de documento, correo personal, estado interno de pagos, teléfono privado). **Bajo ninguna circunstancia** la API pública expondrá directamente la tabla `associates`.

Se crea la tabla dedicada **`public.doctor_directory_profiles`**, vinculada al asociado, que almacena **únicamente los datos explícitamente autorizados por el médico para difusión pública**.

---

## 2. Propuesta de Esquema: `public.doctor_directory_profiles`

```sql
CREATE TABLE IF NOT EXISTS public.doctor_directory_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    associate_id UUID NOT NULL REFERENCES public.associates(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    specialty TEXT NOT NULL DEFAULT 'Ginecología y Obstetricia',
    subspecialty TEXT,
    city TEXT NOT NULL,
    public_phone TEXT,
    public_email TEXT,
    office_address TEXT,
    profile_media_id UUID REFERENCES public.media_items(id) ON DELETE SET NULL,
    bio TEXT,
    website_url TEXT,
    telemedicine_available BOOLEAN NOT NULL DEFAULT false,
    consent_given_at TIMESTAMP WITH TIME ZONE,
    is_published BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Restricción: Un asociado solo puede tener un perfil de directorio público
    CONSTRAINT uq_doctor_directory_associate UNIQUE (associate_id)
);
```

---

## 3. Reglas de Negocio y Consentimiento

1. **Consentimiento Explicito**: `is_published` solo puede ser `true` si existe un registro en `consent_given_at`.
2. **Validación de Estado del Asociado**: Un perfil solo será visible en la web pública si:
   - `doctor_directory_profiles.is_published = true`
   - El asociado en `associates.status` se encuentra activo (`status = 'activo'`).
3. **Desactivación Automática**: Si la directiva cambia el estado del asociado a inactivo o suspendido en `associates`, la política RLS o la consulta JOIN del servidor oculta de inmediato el perfil en `/comunidad/directorio`.

---

## 4. Políticas RLS para `doctor_directory_profiles`

```sql
ALTER TABLE public.doctor_directory_profiles ENABLE ROW LEVEL SECURITY;

-- 1. Lectura pública solo si está publicado Y el asociado está activo
CREATE POLICY "Lectura pública de médicos autorizados y activos"
    ON public.doctor_directory_profiles FOR SELECT
    USING (
        is_published = true
        AND EXISTS (
            SELECT 1 FROM public.associates a
            WHERE a.id = doctor_directory_profiles.associate_id
            AND a.status = 'activo'
        )
    );

-- 2. Gestión total para administración
CREATE POLICY "Gestión de directorio para usuarios autenticados"
    ON public.doctor_directory_profiles FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
```

---

## 5. Búsqueda y Filtrado en la Web Pública (`/comunidad/directorio`)

La interfaz pública permitirá a los usuarios filtrar especialistas por:
- **Ciudad** (ej. Cali, Palmira, Buga, Cartago).
- **Subespecialidad** (ej. Medicina Materno Fetal, Ginecología Oncológica, Uroginecología, Endocrinología Ginecológica).
- **Búsqueda por Nombre**: Coincidencia por `display_name`.
- **Disponibilidad de Telemedicina**: Filtro booleano `telemedicine_available = true`.

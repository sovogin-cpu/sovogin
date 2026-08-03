# Estrategia de Seguridad y Políticas RLS - SOVOGIN

**Fecha:** 3 de agosto de 2026  
**Alcance:** Control de acceso, políticas RLS en PostgreSQL, políticas de Supabase Storage y protección de rutas.

---

> [!IMPORTANT]
> **Aviso de Fase de Análisis:** Este documento define la estrategia recomendada. **NO se deben aplicar modificaciones a las políticas RLS existentes ni al proxy de autenticación en esta etapa.**

---

## 1. Modelo de Roles Detectado en el Sistema

Actualmente, el sistema utiliza dos niveles de acceso a través de la tabla `public.profiles`:

```sql
role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'))
```

- **`user`**: Asociado médico o usuario público registrado.
- **`admin`**: Administrador del panel de control de la asociación.

---

## 2. Diagnóstico de Riesgos de Seguridad Detectados

1. **Riesgo en Middleware (`src/utils/supabase/proxy.ts`)**:
   El middleware actual valida la presencia de un token de sesión autenticado (`if (!user) return redirect('/admin/login')`), pero **no consulta el campo `role` en `public.profiles`**. Esto significa que cualquier usuario con una cuenta estándar podría acceder a las rutas `/admin/*` si no fuera detenido por políticas RLS en el lado del servidor.
2. **Uso del Rol `authenticated` en Supabase Auth**:
   En Supabase Auth, tanto usuarios finales como administradores obtienen el rol JWT `authenticated`. Si una política RLS autoriza mutaciones (`INSERT`, `UPDATE`, `DELETE`) basándose únicamente en `TO authenticated`, cualquier usuario logueado podría realizar modificaciones no autorizadas.
3. **Validación de Archivos en Cliente**:
   Actualmente no existe sanitización ni verificación server-side de tipos MIME o extensiones al subir archivos a los buckets.

---

## 3. Propuesta de Refuerzo de Seguridad

### A. Verificación del Rol Admin en Helper Estandarizado
Crear un helper centralizado para verificar privilegios de administrador tanto en RLS como en Server Actions/API Routes:

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### B. Políticas RLS Recomendadas para `public.media_items`

```sql
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

-- 1. Lectura pública de archivos activos y públicos
CREATE POLICY "Media items visibles públicamente si son públicos y no archivados"
ON public.media_items
FOR SELECT
USING (is_public = true AND is_archived = false);

-- 2. Lectura completa para administradores
CREATE POLICY "Administradores pueden ver todos los media items"
ON public.media_items
FOR SELECT
TO authenticated
USING (public.is_admin());

-- 3. Inserción, actualización y borrado exclusivo para administradores
CREATE POLICY "Solo administradores pueden crear media items"
ON public.media_items
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Solo administradores pueden actualizar media items"
ON public.media_items
FOR UPDATE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Solo administradores pueden eliminar media items"
ON public.media_items
FOR DELETE
TO authenticated
USING (public.is_admin());
```

---

## 4. Políticas de Almacenamiento (Storage Policies)

Para el nuevo bucket central `media`:

1. **Acceso de Lectura**:
   - Lectura pública habilitada si el objeto pertenece al bucket público `media`.
2. **Acceso de Escritura / Eliminación**:
   - Restringido estrictamente a peticiones provenientes de usuarios donde `public.is_admin()` sea evaluado como verdadero en Supabase Auth.

---

## 5. Protección de la Clave `service_role`

- La clave `SUPABASE_SERVICE_ROLE_KEY` debe utilizarse **exclusivamente** en entornos de servidor seguro (API Routes como Webhooks de Openpay o scripts administrativos) y **NUNCA** exponerse en el cliente ni en variables `NEXT_PUBLIC_*`.

---

## 6. Validación y Sanitización de Archivos

Al procesar la subida de un archivo:
1. **Sanitización de nombres**: Eliminar caracteres especiales, espacios y acentos. Usar UUIDv4 como nombre físico en storage.
2. **Whitelist de Tipos MIME**: Rechazar ejecutable (`.exe`, `.sh`, `.php`, `.js`, `.html`).
3. **Verificación de Tamaño Limitado**: Definir límites máximos por tipo de archivo antes de iniciar la subida en Storage.

-- Agregar columnas necesarias para la gestión avanzada de eventos
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS live_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS moderators TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS program_items JSONB DEFAULT '[]';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS speakers_info TEXT;

-- Nota: Si las columnas ya existen, este script no causará errores.

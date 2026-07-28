-- Update resources table to be more flexible
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS resource_type TEXT DEFAULT 'document' CHECK (resource_type IN ('document', 'video', 'link'));
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS format TEXT; -- e.g., 'pdf', 'docx', 'pptx', 'youtube', 'url'
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS description TEXT;

-- Table for Association Benefits (Dynamic Content)
CREATE TABLE IF NOT EXISTS public.association_benefits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Lucide icon name
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for association_benefits
ALTER TABLE public.association_benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Benefits are viewable by everyone." ON public.association_benefits FOR SELECT USING (true);
CREATE POLICY "Admins can manage benefits." ON public.association_benefits 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Ensure associates table exists (if not already there)
CREATE TABLE IF NOT EXISTS public.associates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    document_number TEXT,
    specialty TEXT,
    status TEXT DEFAULT 'Activo' CHECK (status IN ('Activo', 'Inactivo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for associates
ALTER TABLE public.associates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage associates." ON public.associates 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

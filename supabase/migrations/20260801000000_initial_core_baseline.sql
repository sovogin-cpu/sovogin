-- ==============================================================================
-- MIGRACIÓN BASELINE INICIAL CONSOLIDADA: SOVOGIN CORE
-- Fecha: 1 de agosto de 2026
-- Descripción: Creación de las 14 tablas fundamentales del esquema public:
--              profiles, associates, association_benefits, banners, board_members,
--              chatbot_knowledge, event_lives, event_attendees, events,
--              payment_orders, registrations, resources, site_settings, sponsors.
-- ==============================================================================

-- 1. TABLA PUBLIC.PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'member'::text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger para auth.users -> profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. TABLA PUBLIC.ASSOCIATES
CREATE TABLE IF NOT EXISTS public.associates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT,
    status TEXT DEFAULT 'Activo'::text,
    specialty TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    document_number TEXT
);

ALTER TABLE public.associates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage associates." ON public.associates;
CREATE POLICY "Admins can manage associates." ON public.associates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 3. TABLA PUBLIC.ASSOCIATION_BENEFITS
CREATE TABLE IF NOT EXISTS public.association_benefits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.association_benefits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Benefits are viewable by everyone." ON public.association_benefits;
CREATE POLICY "Benefits are viewable by everyone." ON public.association_benefits FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage benefits." ON public.association_benefits;
CREATE POLICY "Admins can manage benefits." ON public.association_benefits
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 4. TABLA PUBLIC.BANNERS
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT,
    position TEXT DEFAULT 'EVENTS_HEADER'::text NOT NULL,
    open_in_new_tab BOOLEAN DEFAULT false NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT banners_display_order_check CHECK (display_order >= 0),
    CONSTRAINT banners_position_check CHECK (position IN ('HOME_HERO', 'EVENTS_HEADER', 'RESOURCES_HEADER', 'ASSOCIATION_HEADER'))
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- 5. TABLA PUBLIC.BOARD_MEMBERS
CREATE TABLE IF NOT EXISTS public.board_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    image_url TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;

-- 6. TABLA PUBLIC.CHATBOT_KNOWLEDGE
CREATE TABLE IF NOT EXISTS public.chatbot_knowledge (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.chatbot_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Knowledge is viewable by everyone" ON public.chatbot_knowledge;
CREATE POLICY "Knowledge is viewable by everyone" ON public.chatbot_knowledge
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage knowledge" ON public.chatbot_knowledge;
CREATE POLICY "Admins can manage knowledge" ON public.chatbot_knowledge
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 7. TABLA PUBLIC.EVENTS
CREATE TABLE IF NOT EXISTS public.events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    location TEXT,
    price NUMERIC(12,2) DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    tiered_pricing JSONB DEFAULT '{"virtual": {"general": 0, "asociado": 0, "residente": 0, "estudiante": 0}, "presencial": {"general": 0, "asociado": 0, "residente": 0, "estudiante": 0}}'::jsonb,
    live_url TEXT,
    moderators TEXT,
    program_items JSONB DEFAULT '[]'::jsonb,
    speakers_info TEXT,
    category TEXT DEFAULT 'Simposio'::text
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Events are viewable by everyone." ON public.events;
CREATE POLICY "Events are viewable by everyone." ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can modify events." ON public.events;
CREATE POLICY "Only admins can modify events." ON public.events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 8. TABLA PUBLIC.EVENT_LIVES
CREATE TABLE IF NOT EXISTS public.event_lives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    banner_url TEXT,
    youtube_video_id TEXT,
    youtube_chat_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.event_lives ENABLE ROW LEVEL SECURITY;

-- 9. TABLA PUBLIC.EVENT_ATTENDEES
CREATE TABLE IF NOT EXISTS public.event_attendees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_live_id UUID REFERENCES public.event_lives(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    document_number TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

-- 10. TABLA PUBLIC.PAYMENT_ORDERS
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reference TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    product_type TEXT NOT NULL,
    product_id UUID,
    product_name TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_last_name TEXT,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    customer_document_type TEXT NOT NULL,
    customer_document_number TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT DEFAULT 'COP'::text NOT NULL,
    status TEXT DEFAULT 'pending'::text NOT NULL,
    openpay_transaction_id TEXT,
    openpay_status TEXT,
    openpay_payment_url TEXT,
    authorization_code TEXT,
    payment_method TEXT,
    raw_openpay_response JSONB,
    raw_webhook_response JSONB,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT payment_orders_amount_check CHECK (amount > 0::numeric),
    CONSTRAINT payment_orders_currency_check CHECK (currency IN ('COP', 'USD')),
    CONSTRAINT payment_orders_document_number_check CHECK (char_length(trim(customer_document_number)) >= 4 AND char_length(trim(customer_document_number)) <= 30),
    CONSTRAINT payment_orders_document_type_check CHECK (customer_document_type IN ('CC', 'CE', 'PAS', 'NIT', 'TI', 'PEP', 'PPT', 'OTHER')),
    CONSTRAINT payment_orders_email_check CHECK (customer_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'::text),
    CONSTRAINT payment_orders_product_type_check CHECK (product_type IN ('event', 'course', 'membership', 'product', 'donation', 'service', 'other')),
    CONSTRAINT payment_orders_status_check CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'expired', 'refunded'))
);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- 11. TABLA PUBLIC.REGISTRATIONS
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    payment_status TEXT DEFAULT 'pending'::text,
    payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    full_name TEXT,
    email TEXT,
    document_number TEXT,
    phone TEXT,
    amount NUMERIC(12,2) DEFAULT 0.00,
    modality TEXT,
    category TEXT,
    status TEXT DEFAULT 'pending'::text
);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can register for events." ON public.registrations;
CREATE POLICY "Public can register for events." ON public.registrations
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own registrations." ON public.registrations;
CREATE POLICY "Users can view their own registrations." ON public.registrations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all registrations." ON public.registrations;
CREATE POLICY "Admins can view all registrations." ON public.registrations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can delete registrations." ON public.registrations;
CREATE POLICY "Admins can delete registrations." ON public.registrations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 12. TABLA PUBLIC.RESOURCES
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Guía Clínica'::text,
    file_url TEXT NOT NULL,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resource_type TEXT DEFAULT 'document'::text,
    format TEXT,
    description TEXT,
    CONSTRAINT resources_resource_type_check CHECK (resource_type IN ('document', 'video', 'link'))
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Resources are viewable by everyone." ON public.resources;
CREATE POLICY "Resources are viewable by everyone." ON public.resources FOR SELECT USING (true);

-- 13. TABLA PUBLIC.SITE_SETTINGS
CREATE TABLE IF NOT EXISTS public.site_settings (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 14. TABLA PUBLIC.SPONSORS
CREATE TABLE IF NOT EXISTS public.sponsors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT DEFAULT 'Bronce'::text,
    logo_url TEXT,
    website_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

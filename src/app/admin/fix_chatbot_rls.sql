-- Fix chatbot_knowledge table and RLS
-- 1. Add missing 'title' column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chatbot_knowledge' AND column_name='title') THEN
        ALTER TABLE public.chatbot_knowledge ADD COLUMN title TEXT;
    END IF;
END $$;

-- 2. Ensure RLS is enabled
ALTER TABLE public.chatbot_knowledge ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Knowledge is viewable by everyone (for chat)." ON public.chatbot_knowledge;
DROP POLICY IF EXISTS "Knowledge is viewable by everyone" ON public.chatbot_knowledge;
DROP POLICY IF EXISTS "Admins can insert knowledge" ON public.chatbot_knowledge;
DROP POLICY IF EXISTS "Admins can update knowledge" ON public.chatbot_knowledge;
DROP POLICY IF EXISTS "Admins can delete knowledge" ON public.chatbot_knowledge;

-- 4. Create proper policies
-- SELECT: Everyone can read
CREATE POLICY "Knowledge is viewable by everyone" ON public.chatbot_knowledge
    FOR SELECT USING (true);

-- INSERT/UPDATE/DELETE: Only admins
CREATE POLICY "Admins can manage knowledge" ON public.chatbot_knowledge
    FOR ALL 
    TO authenticated
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

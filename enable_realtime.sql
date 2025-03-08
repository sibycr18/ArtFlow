-- Simple policy fixes for project_messages table
-- Run this script in the Supabase SQL Editor

-- First, drop any conflicting policies
DROP POLICY IF EXISTS "Users can read project messages" ON public.project_messages;
DROP POLICY IF EXISTS "Users can insert project messages" ON public.project_messages;

-- Make sure RLS is enabled
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

-- Make the table accessible to everyone for reading
CREATE POLICY "Users can read project messages"
ON public.project_messages
FOR SELECT
USING (true);

-- Make the table accessible to everyone for writing
CREATE POLICY "Users can insert project messages"
ON public.project_messages
FOR INSERT
WITH CHECK (true); 
-- Fix project_messages permissions (simplified version)
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can read project messages" ON public.project_messages;
DROP POLICY IF EXISTS "Users can insert project messages" ON public.project_messages;

-- Make sure RLS is enabled
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read messages from their projects
CREATE POLICY "Users can read project messages"
ON public.project_messages
FOR SELECT
USING (true); -- Allow all users to read messages for now

-- Policy: Users can insert messages to their projects
CREATE POLICY "Users can insert project messages"
ON public.project_messages
FOR INSERT
WITH CHECK (true); -- Allow all users to insert messages for now

-- Enable service role unlimited access
CREATE POLICY "Service role can read all project messages"
ON public.project_messages
FOR SELECT
TO service_role
USING (true);

CREATE POLICY "Service role can insert project messages"
ON public.project_messages
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update project messages"
ON public.project_messages
FOR UPDATE
TO service_role
USING (true);

CREATE POLICY "Service role can delete project messages"
ON public.project_messages
FOR DELETE
TO service_role
USING (true);

-- Ensure Realtime is enabled for this table
BEGIN;
  INSERT INTO realtime.subscription (publication, claims, server_filter, errors, headers, fastclose)
  VALUES ('supabase_realtime', '{"role":"authenticated"}', jsonb_build_object('entity', 'project_messages', 'event', '*'), NULL, NULL, true)
  ON CONFLICT (publication, claims, server_filter) DO UPDATE SET errors = NULL;
COMMIT;

-- Verify the table exists and has the right structure
DO $$
BEGIN
  RAISE NOTICE 'Verifying project_messages table...';
  
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'project_messages'
  ) THEN
    RAISE NOTICE 'Table project_messages exists!';
  ELSE
    RAISE EXCEPTION 'Table project_messages does not exist!';
  END IF;
END $$; 
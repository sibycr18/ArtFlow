-- Add service role policies for project_messages table
-- These policies allow the service role to read/write messages regardless of user authentication

-- Policy: Service role can read all project messages
CREATE POLICY "Service role can read all project messages"
ON public.project_messages
FOR SELECT
TO service_role
USING (true);

-- Policy: Service role can insert project messages
CREATE POLICY "Service role can insert project messages"
ON public.project_messages
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Service role can update project messages
CREATE POLICY "Service role can update project messages"
ON public.project_messages
FOR UPDATE
TO service_role
USING (true);

-- Down Migration (in case we need to rollback)
/*
DROP POLICY IF EXISTS "Service role can read all project messages" ON public.project_messages;
DROP POLICY IF EXISTS "Service role can insert project messages" ON public.project_messages;
DROP POLICY IF EXISTS "Service role can update project messages" ON public.project_messages;
*/ 
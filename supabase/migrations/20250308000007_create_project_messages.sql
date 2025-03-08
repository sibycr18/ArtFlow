-- Create project_messages table for chat functionality
DO $$
DECLARE
    projects_id_type TEXT;
    users_id_type TEXT;
BEGIN
    -- First, check the data types of the id columns in projects and users tables
    SELECT data_type INTO projects_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'id';
    
    SELECT data_type INTO users_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id';

    -- Create the project_messages table
    EXECUTE 'CREATE TABLE IF NOT EXISTS public.project_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id ' || projects_id_type || ' NOT NULL,
        user_id ' || users_id_type || ' NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone(''utc''::text, now()) NOT NULL,
        is_system_message BOOLEAN DEFAULT false
    )';

    -- Add foreign key constraints if table exists
    EXECUTE 'ALTER TABLE public.project_messages 
        ADD CONSTRAINT project_messages_project_id_fkey 
        FOREIGN KEY (project_id) 
        REFERENCES public.projects(id) ON DELETE CASCADE';
        
    EXECUTE 'ALTER TABLE public.project_messages 
        ADD CONSTRAINT project_messages_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES public.users(id) ON DELETE CASCADE';
END
$$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS project_messages_project_id_idx ON public.project_messages(project_id);
CREATE INDEX IF NOT EXISTS project_messages_created_at_idx ON public.project_messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_messages

-- Policy: Users can read messages if they are admin or collaborator of the project
CREATE POLICY "Users can read project messages"
ON public.project_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = project_messages.project_id
        AND (
            projects.admin_id = auth.uid() OR
            auth.uid() = ANY (projects.collaborators)
        )
    )
);

-- Policy: Users can insert messages if they are admin or collaborator of the project
CREATE POLICY "Users can insert project messages"
ON public.project_messages
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = project_messages.project_id
        AND (
            projects.admin_id = auth.uid() OR
            auth.uid() = ANY (projects.collaborators)
        )
    )
);

-- Down Migration (in case we need to rollback)
/*
DROP POLICY IF EXISTS "Users can insert project messages" ON public.project_messages;
DROP POLICY IF EXISTS "Users can read project messages" ON public.project_messages;
DROP TABLE IF EXISTS public.project_messages;
*/ 
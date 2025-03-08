-- Update projects table to include admin and collaborators
-- First, check if the table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
        -- Create the projects table if it doesn't exist
        CREATE TABLE public.projects (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            admin_id UUID NOT NULL REFERENCES public.users(id),
            collaborators UUID[] DEFAULT '{}'::UUID[]
        );
    ELSE
        -- Add columns to existing table if they don't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'name') THEN
            ALTER TABLE public.projects ADD COLUMN name TEXT NOT NULL DEFAULT 'Untitled Project';
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'created_at') THEN
            ALTER TABLE public.projects ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'admin_id') THEN
            ALTER TABLE public.projects ADD COLUMN admin_id UUID REFERENCES public.users(id);
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'collaborators') THEN
            ALTER TABLE public.projects ADD COLUMN collaborators UUID[] DEFAULT '{}'::UUID[];
        END IF;
    END IF;
END
$$;

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own projects"
    ON public.projects
    FOR SELECT
    USING (
        admin_id = auth.uid() OR 
        auth.uid() = ANY(collaborators)
    );

CREATE POLICY "Admins can update their own projects"
    ON public.projects
    FOR UPDATE
    USING (admin_id = auth.uid());

CREATE POLICY "Admins can delete their own projects"
    ON public.projects
    FOR DELETE
    USING (admin_id = auth.uid());

CREATE POLICY "Users can insert projects"
    ON public.projects
    FOR INSERT
    WITH CHECK (auth.uid() = admin_id);

-- Create function to search users by email
CREATE OR REPLACE FUNCTION search_users_by_email(search_email TEXT)
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT,
    picture TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT id, email, name, picture
    FROM public.users
    WHERE email ILIKE '%' || search_email || '%'
    LIMIT 10;
$$;

-- Down migration
/*
DROP FUNCTION IF EXISTS search_users_by_email(TEXT);

DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert projects" ON public.projects;

-- Do not drop or modify the projects table in the down migration
-- as it might contain important user data. Instead, you can create
-- a separate migration to handle table schema changes if needed.
*/ 
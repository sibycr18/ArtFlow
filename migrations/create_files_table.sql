-- Create files table
CREATE TABLE public.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('drawing', 'text', 'model')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    
    -- Add an index for faster lookups by project
    CONSTRAINT files_project_id_name_unique UNIQUE (project_id, name)
);

-- Enable RLS
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view files in their projects"
    ON public.files
    FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM public.projects 
            WHERE admin_id = auth.uid() 
            OR collaborators::text LIKE '%' || auth.uid() || '%'
        )
    );

CREATE POLICY "Project admins can insert files"
    ON public.files
    FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE admin_id = auth.uid()
        )
    );

CREATE POLICY "Project admins can update files"
    ON public.files
    FOR UPDATE
    USING (
        project_id IN (
            SELECT id FROM public.projects WHERE admin_id = auth.uid()
        )
    );

CREATE POLICY "Project admins can delete files"
    ON public.files
    FOR DELETE
    USING (
        project_id IN (
            SELECT id FROM public.projects WHERE admin_id = auth.uid()
        )
    );

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_files_updated_at_trigger
BEFORE UPDATE ON public.files
FOR EACH ROW
EXECUTE FUNCTION update_files_updated_at();
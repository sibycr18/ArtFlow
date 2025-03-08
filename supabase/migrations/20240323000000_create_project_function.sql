-- Create an RPC function to directly insert projects
CREATE OR REPLACE FUNCTION create_project_directly(
    project_id UUID,
    project_name TEXT,
    admin_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Insert the project
    INSERT INTO public.projects (
        id,
        name,
        admin_id,
        collaborators
    ) VALUES (
        project_id,
        project_name,
        admin_user_id,
        '{}' -- Empty array for collaborators
    )
    RETURNING to_jsonb(projects.*) INTO result;
    
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

-- Add policy to allow the function to create projects
CREATE POLICY "Allow project direct creation" 
    ON public.projects 
    FOR INSERT 
    WITH CHECK (true);

-- Down migration
/*
DROP FUNCTION IF EXISTS create_project_directly(UUID, TEXT, UUID);
DROP POLICY IF EXISTS "Allow project direct creation" ON public.projects;
*/ 
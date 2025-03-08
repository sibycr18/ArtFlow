-- Add file_type and name columns to files table if they don't exist
DO $$ 
BEGIN
    -- Add file_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'files' 
        AND column_name = 'file_type'
    ) THEN
        ALTER TABLE public.files ADD COLUMN file_type TEXT NOT NULL DEFAULT 'drawing';
        -- Add check constraint
        ALTER TABLE public.files ADD CONSTRAINT files_file_type_check 
            CHECK (file_type IN ('drawing', 'text', 'model'));
    END IF;

    -- Add name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'files' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE public.files ADD COLUMN name TEXT NOT NULL DEFAULT 'Untitled';
    END IF;
END $$; 
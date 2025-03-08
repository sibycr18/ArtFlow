-- Add created_by column to files table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'files' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.files ADD COLUMN created_by UUID REFERENCES public.users(id);
    END IF;
END $$; 
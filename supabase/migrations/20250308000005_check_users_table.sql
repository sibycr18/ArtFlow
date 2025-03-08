-- Check the structure of the users table
DO $$ 
DECLARE
    column_info RECORD;
BEGIN
    RAISE NOTICE 'Users table structure:';
    FOR column_info IN 
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '% (% - nullable: %)', 
            column_info.column_name, 
            column_info.data_type,
            column_info.is_nullable;
    END LOOP;
END $$; 
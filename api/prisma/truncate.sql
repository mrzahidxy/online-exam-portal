DO $$
DECLARE
    table_name TEXT; -- Variable to hold the name of each table in the loop
BEGIN
    -- Loop through all table names in the 'public' schema
    FOR table_name IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        -- Dynamically truncate each table, restart identity, and cascade
        EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE;', table_name);
    END LOOP;
END $$;


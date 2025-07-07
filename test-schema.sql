-- Test if the database schema matches Better Auth expectations
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'sessions', 'accounts', 'verifications')
ORDER BY table_name, column_name;
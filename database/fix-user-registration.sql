-- Fix user registration flow by ensuring handle_new_user trigger exists
-- This ensures new users are properly created in public.users table

-- First, check if the trigger function exists
DO $$
BEGIN
    -- Create the trigger function if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO public.users (id, email, full_name, is_active, created_at, updated_at)
          VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', NEW.email),
            true,
            NOW(),
            NOW()
          )
          ON CONFLICT (id) DO NOTHING;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
    END IF;
END $$;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_new_user') THEN
        CREATE TRIGGER handle_new_user
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- Fix existing users who don't have public.users entries
INSERT INTO public.users (id, email, full_name, is_active, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'display_name', au.email),
  true,
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Ensure user_profiles exist for all users (this was supposed to be done during organization setup)
INSERT INTO user_profiles (
  id,
  user_id,
  display_name,
  email_notifications,
  theme_preference,
  bio,
  preferences,
  settings,
  timezone,
  created_at,
  updated_at
)
SELECT
  au.id,
  au.id,
  COALESCE(au.raw_user_meta_data->>'display_name', au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1)),
  true,
  'system',
  NULL,
  '{}',
  '{}',
  'UTC',
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify the fix
SELECT
  'handle_new_user trigger' as component,
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_new_user') THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT
  'handle_new_user function' as component,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT
  'Users in auth.users' as component,
  COUNT(*)::text as status
FROM auth.users
UNION ALL
SELECT
  'Users in public.users' as component,
  COUNT(*)::text as status
FROM public.users
UNION ALL
SELECT
  'Users with profiles' as component,
  COUNT(*)::text as status
FROM user_profiles
ORDER BY component;

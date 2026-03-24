-- Migration: Add email column to profiles
-- Run this on existing databases that already have profiles table

-- Add email column (nullable first so existing rows don't break)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- Backfill: set email to display_name@bandidos.local for existing accounts
UPDATE profiles SET email = LOWER(REPLACE(display_name, ' ', '')) || '@bandidos.local' WHERE email IS NULL;

-- Now make it NOT NULL and UNIQUE
ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

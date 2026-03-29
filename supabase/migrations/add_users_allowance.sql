-- Run once in Supabase SQL Editor if your remote `users` table was created before `allowance` existed.
-- (The app works without this column locally; sync will omit `allowance` until this is applied.)

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS allowance numeric NOT NULL DEFAULT 0;

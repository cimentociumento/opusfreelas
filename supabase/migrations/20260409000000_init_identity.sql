-- Identity profiles keyed by Clerk JWT subject (auth.jwt()->>'sub')
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL UNIQUE,
  is_contractor boolean NOT NULL DEFAULT true,
  is_provider boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_clerk_user_id_idx ON public.profiles (clerk_user_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (clerk_user_id = (auth.jwt()->>'sub'));

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (clerk_user_id = (auth.jwt()->>'sub'));

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (clerk_user_id = (auth.jwt()->>'sub'))
  WITH CHECK (clerk_user_id = (auth.jwt()->>'sub'));

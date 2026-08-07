-- Adiciona identidade pessoal minima ao perfil (nome exibido, avatar opcional).
-- Sem NOT NULL: display_name nulo e o sinal de "onboarding pendente" lido
-- pelo app (ver identity.getProfile e o guard em (app)/_layout.tsx no mobile).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Postgres nao permite CREATE OR REPLACE mudar o RETURNS TABLE de uma
-- function existente; precisa dropar antes de recriar com a coluna nova.
DROP FUNCTION IF EXISTS public.search_providers(float8, float8, text, integer);

CREATE OR REPLACE FUNCTION public.search_providers(
  user_lat float8,
  user_lng float8,
  search_category text DEFAULT NULL,
  radius_km integer DEFAULT 50
)
RETURNS TABLE (
  clerk_user_id text,
  is_provider boolean,
  display_name text,
  service_categories text[],
  distance_meters float8
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.clerk_user_id,
    p.is_provider,
    p.display_name,
    p.service_categories,
    ST_Distance(
      p.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) as distance_meters
  FROM public.profiles p
  WHERE
    p.is_provider = true
    AND (search_category IS NULL OR search_category = ANY(p.service_categories))
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_meters ASC;
END;
$$;

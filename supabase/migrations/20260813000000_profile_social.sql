-- Perfil social: dá identidade e credibilidade ao prestador, e gate de
-- visibilidade na busca. Todas as colunas nullable — perfis existentes ficam
-- "incompletos" e é esse estado que orienta o onboarding no app.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS municipality text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS years_experience smallint;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_urls text[] DEFAULT '{}';

-- search_providers passa a esconder prestadores com perfil social incompleto.
-- RETURNS TABLE inalterado → CREATE OR REPLACE basta (sem DROP FUNCTION).
CREATE OR REPLACE FUNCTION public.search_providers(
  user_lat float8,
  user_lng float8,
  search_category text DEFAULT NULL,
  radius_km integer DEFAULT 50
)
RETURNS TABLE (
  clerk_user_id text,
  is_provider boolean,
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
    p.service_categories,
    ST_Distance(
      p.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) as distance_meters
  FROM public.profiles p
  WHERE
    p.is_provider = true
    AND p.bio IS NOT NULL
    AND array_length(p.portfolio_urls, 1) > 0
    AND (search_category IS NULL OR search_category = ANY(p.service_categories))
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_meters ASC;
END;
$$;

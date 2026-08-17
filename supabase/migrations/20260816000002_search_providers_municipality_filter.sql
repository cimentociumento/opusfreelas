-- Filtro por município na busca de prestadores (discovery.searchProviders em
-- apps/api/src/rpc/discovery.ts), espelhando o mesmo padrão de
-- get_visible_demands: raio via ST_DWithin continua obrigatório, município
-- vira um filtro exato opcional em cima dele.
--
-- search_providers ganha um 5º parâmetro. A lição de 20260816000001 se
-- aplica aqui também: CREATE OR REPLACE não troca a assinatura quando o
-- número de parâmetros muda — cria um overload e quebra o PostgREST
-- (PGRST203) em qualquer chamada com 4 argumentos. DROP explícito primeiro.
DROP FUNCTION IF EXISTS public.search_providers(float8, float8, text, integer);

CREATE FUNCTION public.search_providers(
  user_lat float8,
  user_lng float8,
  search_category text DEFAULT NULL,
  radius_km integer DEFAULT 50,
  filter_municipality text DEFAULT NULL
)
RETURNS TABLE (
  clerk_user_id text,
  is_provider boolean,
  display_name text,
  avatar_url text,
  municipality text,
  bio text,
  years_experience smallint,
  portfolio_urls text[],
  service_categories text[],
  phone text,
  completed_services_count integer,
  rating_average numeric,
  rating_count integer,
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
    p.avatar_url,
    p.municipality,
    p.bio,
    p.years_experience,
    p.portfolio_urls,
    p.service_categories,
    p.phone,
    p.completed_services_count,
    p.rating_average,
    p.rating_count,
    ST_Distance(
      p.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) as distance_meters
  FROM public.profiles p
  WHERE
    p.is_provider = true
    AND (search_category IS NULL OR search_category = ANY(p.service_categories))
    AND (filter_municipality IS NULL OR p.municipality = filter_municipality)
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_meters ASC;
END;
$$;

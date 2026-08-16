-- Contato direto e credibilidade do prestador: fecha o loop "descoberta ->
-- WhatsApp/telefone" que é o modelo de negócio do V1 (fechamento fora da
-- plataforma). completed_services_count/rating_average/rating_count entram
-- com default estático — não existe ainda fluxo de avaliação/conclusão que
-- os popule; ficam prontos para uma feature futura preenchê-los.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS completed_services_count integer DEFAULT 0 NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating_average numeric(3,2) DEFAULT 5.00 NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating_count integer DEFAULT 0 NOT NULL;

-- search_providers ganha as colunas de contato/reputação no RETURNS TABLE,
-- o que exige DROP FUNCTION antes do CREATE (Postgres não permite
-- CREATE OR REPLACE mudar a lista de colunas retornadas — a migration
-- 20260813000000 pulou esse passo e teria quebrado numa aplicação limpa).
--
-- Remove também o gate de visibilidade "bio IS NOT NULL AND portfolio > 0"
-- introduzido em 20260813000000: decisão de produto confirmada é mostrar
-- todo prestador com is_provider = true dentro do raio/categoria, completo
-- ou não — a busca deixa de ser o mecanismo que força onboarding completo.
DROP FUNCTION IF EXISTS public.search_providers(float8, float8, text, integer);

CREATE FUNCTION public.search_providers(
  user_lat float8,
  user_lng float8,
  search_category text DEFAULT NULL,
  radius_km integer DEFAULT 50
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
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_meters ASC;
END;
$$;

-- get_visible_demands ganha exclude_contractor_id: reforça a regra de
-- negócio "o prestador não vê a própria demanda publicada como se fosse de
-- terceiro" na tela de Vagas Disponíveis (demands.listVisible em
-- apps/api/src/rpc/demands.ts). RETURNS SETOF não muda, então CREATE OR
-- REPLACE com um parâmetro novo no final é seguro (sem DROP).
CREATE OR REPLACE FUNCTION public.get_visible_demands(
  user_lat float8,
  user_lng float8,
  filter_municipality text DEFAULT NULL,
  exclude_contractor_id text DEFAULT NULL
)
RETURNS SETOF public.demands
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.demands
  WHERE
    status = 'aberta'
    AND ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      visibility_radius * 1000
    )
    AND (filter_municipality IS NULL OR municipality = filter_municipality)
    AND (exclude_contractor_id IS NULL OR contractor_id != exclude_contractor_id)
  ORDER BY
    location <-> ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography ASC;
END;
$$;

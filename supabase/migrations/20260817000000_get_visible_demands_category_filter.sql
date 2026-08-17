-- Filtro por categoria de serviço em "Vagas na Região"
-- (demands.listVisible em apps/api/src/rpc/demands.ts): o prestador hoje
-- vê toda demanda aberta no raio/município, sem poder restringir por tipo
-- de serviço. get_visible_demands ganha um 5º parâmetro.
--
-- Mesma lição de 20260816000001: CREATE OR REPLACE não troca a assinatura
-- quando o número de parâmetros muda — cria um overload e quebra o
-- PostgREST (PGRST203) em qualquer chamada com 4 argumentos. DROP explícito
-- primeiro.
DROP FUNCTION IF EXISTS public.get_visible_demands(float8, float8, text, text);

CREATE FUNCTION public.get_visible_demands(
  user_lat float8,
  user_lng float8,
  filter_municipality text DEFAULT NULL,
  exclude_contractor_id text DEFAULT NULL,
  filter_category text DEFAULT NULL
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
    AND (filter_category IS NULL OR service_type = filter_category)
  ORDER BY
    location <-> ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography ASC;
END;
$$;

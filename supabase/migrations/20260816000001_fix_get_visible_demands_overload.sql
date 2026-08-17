-- 20260816000000 trocou get_visible_demands de 3 para 4 parâmetros usando
-- CREATE OR REPLACE, mas o Postgres não substitui uma função quando a lista
-- de parâmetros muda de tamanho — ele cria uma segunda função (overload) e
-- deixa a de 3 parâmetros viva. Resultado: PostgREST não consegue decidir
-- qual das duas usar (PGRST203) numa chamada com só 2 argumentos, quebrando
-- demands.listVisible em apps/api/src/rpc/demands.ts. Remove a versão antiga
-- explicitamente para sobrar só a de 4 parâmetros.
DROP FUNCTION IF EXISTS public.get_visible_demands(float8, float8, text);

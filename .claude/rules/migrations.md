---
paths:
  - "supabase/migrations/**"
---

Migrations são append-only. Nunca editar uma migration já aplicada — criar uma
nova com timestamp maior.

Toda tabela que guarda dado de usuário precisa de política RLS explícita na
mesma migration que a cria. Tabela sem RLS é achado S1.

Toda coluna geográfica usa `GEOGRAPHY(POINT, 4326)` com índice GiST. Consulta de
raio usa `ST_DWithin` — nunca cálculo manual de distância em JS.

Ao criar ou alterar política RLS, descrever no comentário SQL qual regra de
negócio ela reforça e qual handler da API depende dela.

---
paths:
  - "apps/api/src/rpc/**"
  - "apps/api/src/middleware/**"
---

Todo handler RPC valida input com o schema Zod de `@amauc/shared` via
`safeParse` e retorna 400 com `error.flatten()` antes de qualquer query.

Todo handler que lê ou escreve recurso de usuário valida ownership
(`contractor_id === auth.userId`) antes da operação, retornando 403 quando
falha e 404 quando o recurso não existe. A API é a primeira linha; RLS no
Supabase é a última — as duas são obrigatórias, nunca uma só.

Nunca remover a checagem que bloqueia `DEV_BYPASS_TOKEN` quando
`NODE_ENV=production`, sob nenhuma justificativa de teste.

Nunca inventar nome de tabela, coluna ou endpoint. Se não tem certeza do schema,
leia a migration em `supabase/migrations/` antes de escrever a query.

Erro nunca é engolido: `catch {}` vazio é proibido. Logar com contexto
`[modulo.funcao]` ou propagar.

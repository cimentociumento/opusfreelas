# HANDOFF — cadastro bifurcado + perfil social

**Data:** 2026-08-13 · **Branch:** `fix/cadastro-bifurcado` (pushed to origin) · **Autoria: exclusivamente do usuário (NENHUM commit tem trailer de Claude — manter assim).**

## Estado atual

Feature **code-complete e verificada em testes unitários**, mas **NÃO verificada ponta-a-ponta** porque o projeto Supabase `open-freelas` está **pausado**. 16 commits na branch.

- Spec: `docs/superpowers/specs/2026-08-13-cadastro-bifurcado-design.md`
- Plano (com desvio da Task 11 documentado no fim): `docs/superpowers/plans/2026-08-13-cadastro-bifurcado.md`

### O que foi entregue
Após telefone+OTP → onboarding (**nome + município**) → escolha de papel. **Contratante** = cadastro leve. **Prestador** = exige perfil social (**bio ≥40 chars, anos de experiência, ≥1 foto de portfólio**) e fica **escondido da busca** (`search_providers`) até completar — é o gate anti-fraude. Foto de portfólio sobe **via API Hono** (`identity.uploadPortfolioImage`), nunca direto pro Supabase (respeita "UI não fala direto com Supabase"). Base visual NativeWind + React Native Reusables adicionada (telas novas usam; resto do app fica pra depois).

### Evidência de teste (rodei e passou)
- `pnpm --filter @amauc/api test` → **33/33**.
- Testes mobile novos (onboarding, guard, hook, portfolio) → **14/14**. `cd apps/mobile && pnpm typecheck` → limpo.

### Bug crítico que a revisão final pegou (já corrigido)
Usuário novo não tinha linha em `profiles`; `identity.updateProfile` usava `.update()` → 0 linhas → 500 → onboarding travava. Corrigido: agora é **upsert** (commit `afec3ea`). Também corrigidos: bypass do gate de portfólio (agora valida que cada path começa com `${userId}/`) e mensagem falsa de "você está visível" no provider-setup.

## ⚠️ FALTA FAZER (ação do usuário / próxima sessão)

### Bloqueado pelo Supabase pausado — fazer assim que despausar:
1. Despausar o projeto Supabase `open-freelas` (dashboard → Restore).
2. `supabase db push` — aplica 2 migrations: `20260813000000_profile_social.sql` (colunas + gate na `search_providers`) e `20260813000001_portfolio_storage.sql` (bucket `portfolio` + policies). ⚠️ As `CREATE POLICY` de storage NÃO são idempotentes — só na primeira aplicação.
3. **E2E** em Web + iOS + Android: onboarding de usuário NOVO (sem linha em `profiles`) → caminho prestador → escolher foto → salvar → confirmar que o prestador aparece em `search_providers` (e NÃO aparecia antes de completar bio+foto).
4. **Gates visuais** (`cd apps/mobile && pnpm web`): confirmar NativeWind renderizando (verde da marca `--primary`, componentes RNR).

### Pendências de código (opcionais, decidir):
- **3 testes pré-existentes quebrados** em `apps/mobile/app/(auth)/__tests__/sign-in.test.tsx` e `sign-up.test.tsx` — placeholder desatualizado (`"seu_usuario"` vs `"Seu nome de usuário"`). NÃO é desta feature (já quebrado na main). Correção trivial: alinhar o placeholder esperado no teste.
- **Erro de tsc pré-existente** em `apps/api` `demands-mapper.ts` (`ParsedCoordinates`). CI da API roda vitest (não tsc), então não bloqueia, mas convém corrigir.
- **3 Minors adiados**: `catch (error: any)` em `onboarding.tsx`/`provider-setup.tsx` (usar `unknown`+narrow); `ensureProfileInDb` em `apps/api/src/lib/profile.ts` é dead code (0 callers — deletar ou usar); divergência do gate de completude (DB exige bio+foto, cliente exige também `years`) — alinhar as duas definições.

### Backlog já registrado (`.planning/ROADMAP.md`, seção Backlog):
- 999.1 Chat interno via Supabase Realtime (reverte decisão de fechamento fora da plataforma — precisa de spec próprio).
- 999.2 PostGIS mais abrangente.
- 999.3 Reforma visual do restante do app (demandas/descoberta/perfil) no padrão Workana/GetNinjas/99Freelas, estendendo os tokens NativeWind. Continuação de `BRIEF-MIGRACAO-UI.md` (branch `feat/nativewind-piloto`), começando por `demands/index.tsx`.

## Regras inegociáveis (CLAUDE.md)
- **Autoria só do usuário** — nunca adicionar `Co-Authored-By: Claude` nem `Claude-Session` nos commits.
- Fluxo `UI → hook → RPC → Hono → Supabase`; UI nunca fala direto com Supabase. Ownership sempre do JWT. Migrations append-only. Contratos só em `@amauc/shared`. Sem `as any`/`@ts-ignore`. Diff mínimo. Conventional Commits.

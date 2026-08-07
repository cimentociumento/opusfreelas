# Identidade & Onboarding de Papel — Design

**Data:** 2026-08-07
**Status:** Aprovado (aguardando revisão do spec escrito)
**Sub-projeto:** 1 de 3 (ver Roadmap no final)

## Problema

Hoje o login OTP (Clerk) cria/ativa a conta e joga o usuário direto na home,
sem nunca coletar nome, foto ou intenção de papel. `profiles` não tem coluna
de identidade pessoal — só `is_contractor`, `is_provider`, `location`,
`service_categories`. Consequência concreta: a busca de prestadores
(`search_providers`) retorna categoria e distância, mas nenhum nome — um
contratante não consegue saber *quem* está contatando. O onboarding de
prestador (`provider-setup.tsx`) já existe e funciona, mas é um botão solto
na home, não parte de um fluxo guiado; a maioria dos usuários nunca vai
descobrir que ele existe.

Isso é a causa raiz do "mecanismo fraco comparado a GetNinjas/Workana": não é
falta de estilo visual, é falta do dado e do fluxo.

## Decisão de escopo

Mantém D-06 (`.planning/phases/01-foundation-identity/01-CONTEXT.md`): conta
única, dois papéis, sem forçar escolha exclusiva no cadastro. Onboarding
coleta identidade básica e oferece — não força — o papel de prestador.

Fora de escopo aqui: redesenho visual (sub-projeto 2), auditoria de lógica de
negócio (sub-projeto 3). Este sub-projeto é estrutura + dado mínimo viável,
com UI simples usando componentes/tokens já existentes.

## Modelo de dados

Nova migration (`supabase/migrations/20260807000000_profile_identity.sql`,
append-only, segue `.claude/rules/migrations.md`):

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
```

Sem NOT NULL — perfis existentes (contas já criadas hoje) ficam com
`display_name IS NULL`, e é exatamente esse null que sinaliza "onboarding
pendente" (ver Fluxo). RLS já cobre a tabela inteira (`profiles_select_own` /
`profiles_update_own`), nenhuma política nova necessária.

`search_providers` (`20260428000001_profiles_discovery.sql`) precisa retornar
`display_name` também — sem isso o onboarding não resolve o problema real
(contratante ainda não vê nome na busca). Postgres não deixa `CREATE OR
REPLACE FUNCTION` mudar o `RETURNS TABLE` de uma function existente — a nova
migration precisa `DROP FUNCTION public.search_providers(float8, float8,
text, integer);` antes do `CREATE OR REPLACE` com a coluna adicional.

## Contrato (`@amauc/shared`)

`packages/shared/src/identity/schemas.ts` ganha:

```ts
export const updateIdentityProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
});
export type UpdateIdentityProfileInput = z.infer<typeof updateIdentityProfileSchema>;
```

`identity.getProfile` (`apps/api/src/rpc/identity.ts`) passa a retornar
`displayName` e `avatarUrl` no payload existente.

Novo handler `identity.updateProfile`, mesmo padrão dos outros (safeParse →
400 com `error.flatten()` → update `profiles` filtrado por `clerk_user_id`
do JWT — sem checagem extra de ownership porque já é auto-referenciado, igual
`updateRoles`).

## Fluxo

1. Após `activateClerkSession` (em `sign-in.tsx`), em vez de `router.replace("/")`
   direto, chama `identity.getProfile`. Se `displayName` vier vazio/null,
   `router.replace("/onboarding")`; senão `router.replace("/")` (comportamento
   atual, inalterado).
2. Tela nova `app/(app)/onboarding.tsx`: campo nome (obrigatório, 2-80 chars,
   client-side espelha o Zod do shared), botão "Continuar". Sem opção de
   pular — meta é resolver o dado ausente, não adicionar fricção opcional.
3. Depois de salvar nome (`identity.updateProfile`), pergunta simples:
   "Quer também oferecer serviços?" com dois botões — "Agora não" (→ `/`,
   home mostra os dois blocos como hoje, `is_provider` continua `false`) ou
   "Sim" (→ `/profile/provider-setup`, tela já existente, sem mudança nela
   além de rehidratar `displayName` se precisar).
4. `(app)/_layout.tsx` ganha o mesmo guard: se `isSignedIn` e perfil sem
   `displayName`, força redirect pra `/onboarding` mesmo se o usuário tentar
   navegar direto pra outra rota da área logada (cobre deep link / voltar
   pelo histórico do navegador).

Usuário existente com `display_name` já preenchido (depois desta migration,
ninguém — mas cobre re-execução/teste): pula onboarding, vai direto pra home.

## Erro e edge cases

- `identity.getProfile` falhar na checagem pós-login (rede instável): trata
  como "perfil desconhecido" → manda pra onboarding mesmo assim (pior caso é
  pedir nome de novo pra quem já tem, não travar o usuário fora do app).
- Nome vazio/só espaço: Zod `.trim().min(2)` já barra client e server side.
- Onboarding não é bypassável via deep link direto pra `/demands/create` etc.
  — coberto pelo guard no `(app)/_layout.tsx` do passo 4.

## Testes

- `apps/api`: teste do handler `identity.updateProfile` (input válido,
  input inválido → 400, retorno reflete update) e do `identity.getProfile`
  atualizado (inclui `displayName`/`avatarUrl`).
- `apps/api`: teste de `search_providers` retornando `display_name` (teste de
  integração contra Supabase de teste, já que é function SQL).
- `apps/mobile`: teste de `onboarding.tsx` (submit válido chama RPC e
  navega; submit vazio bloqueia).
- `apps/mobile`: teste do guard em `(app)/_layout.tsx` (perfil sem nome
  redireciona pra onboarding mesmo entrando por rota profunda).

## Roadmap (fora deste spec)

- **Sub-projeto 2 — UI ao padrão de mercado**: redesenho visual das telas de
  auth/onboarding/home/discovery, com o dado de identidade agora disponível
  (nome, futuramente foto) pra exibir de fato quem é quem.
- **Sub-projeto 3 — Auditoria de lógica de negócio**: revisão do fluxo
  contratante↔prestador como um todo (ex.: `search_providers` sem nome era um
  sintoma; pode haver outros gaps semelhantes em `demands`).

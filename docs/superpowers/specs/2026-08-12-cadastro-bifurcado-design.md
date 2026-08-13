# Cadastro bifurcado (contratante/prestador) + perfil social — Design

**Data:** 2026-08-12
**Status:** Aprovado (aguardando revisão do spec escrito)
**Sub-projeto:** 1 de N (ver Próximos passos no final — chat interno, PostGIS
mais abrangente e reforma visual do resto do app ficam para specs futuros)

## Problema

O cadastro atual (`apps/mobile/app/(auth)/sign-up.tsx`, commit `192c7d7` na
`main`) pede telefone + username + senha + OTP e joga o usuário direto na
home. Não há nome, não há município, não há nada que diferencie um prestador
sério de uma conta vazia. `search_providers` devolve categoria e distância,
mas nenhuma informação que gere confiança — o app "parece cru" justamente
porque falta o dado, não porque falta estilo.

Existe trabalho anterior não mergeado nesse sentido: a branch
`feat/nativewind-piloto` (criada por uma sessão anterior do Claude Code)
implementou `display_name`/`avatar_url` + tela de onboarding + início da
migração para NativeWind, mas divergiu de `main` **antes** dos fixes de OTP e
da reformulação de sign-in/sign-up que o Murilo fez depois (`1e62f3b` é o
ancestral comum). As duas linhas não dão merge direto — os arquivos de
sign-in/sign-up foram reescritos dos dois lados de formas incompatíveis.

## Decisão de escopo

Mantém `D-06` (`.planning/phases/01-foundation-identity/01-CONTEXT.md`): uma
conta pode acumular os dois papéis. O que muda é o **formulário** de
cadastro, que se bifurca por intenção logo após o OTP — não é criação de
contas separadas.

Fora de escopo aqui (ver seção "Próximos passos"): chat interno via Supabase
Realtime, uso mais amplo de PostGIS além do que já existe em
`search_providers`, e reforma visual do restante do app (demandas,
descoberta, perfil) no padrão Workana/GetNinjas/99Freelas.

## Estratégia de branch

Nova branch a partir da `main` atual (`712fac7`). **Não** faz merge bruto de
`feat/nativewind-piloto` — em vez disso, traz seletivamente:
- o wiring de build do NativeWind (`bd2a010`: babel/metro/tailwind config,
  `global.css`, probe removido depois de confirmar);
- a skill `.claude/skills/design-system/SKILL.md` (direção visual
  limpa/neutra, linha Linear/Notion/Vercel — mesma estética do shadcn via
  React Native Reusables);
- a lógica de identidade/onboarding é **reimplementada**, adaptada ao fluxo
  de dois caminhos definido aqui, em vez de portada como estava (single-path
  + adicionar papel depois via botão solto).

Não traz o pacote `.agents/skills/cavecrew`/`caveman-*` (ferramentas de
terceiros incluídas num zip extraído, sem relação com este trabalho).

## Modelo de dados

Nova migration, append-only (`supabase/migrations/20260812000000_profile_social.sql`):

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS municipality text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS years_experience smallint;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_urls text[] DEFAULT '{}';
```

Todas nullable — perfis existentes ficam "incompletos" e é exatamente esse
estado que orienta o fluxo (ver "Fluxo"). Sem `CHECK` de valores permitidos em
`municipality` por enquanto: mesma decisão que `service_categories` tomou no
início (texto livre primeiro, constraint de allow-list só chegou meses
depois, em `a7b78df`) — evita bloquear cadastro por uma lista de municípios
da AMAUC que ainda precisa ser validada com o usuário antes de virar
constraint de banco.

`years_experience`: inteiro pequeno, sem constraint de faixa no banco (Zod
valida `0-60` no client/server, ver Contrato). `portfolio_urls`: array de
paths do Storage (não URLs assinadas — resolvidas no momento da leitura).

RLS já cobre a tabela inteira (`profiles_select_own`/`profiles_update_own`),
nenhuma policy nova necessária na tabela.

### Storage

Novo bucket Supabase Storage `portfolio`:
- policy de escrita: `authenticated`, restrita a objetos cujo path comece com
  `{auth.jwt()->>'sub'}/` (mesmo padrão de ownership usado em `profiles`);
- policy de leitura: pública (as fotos aparecem na busca do contratante, que
  não está necessariamente autenticado como o dono).

### `search_providers`

Muda o filtro de visibilidade — hoje é só `is_provider = true`. Passa a
exigir perfil social completo:

```sql
WHERE p.is_provider = true
  AND p.bio IS NOT NULL
  AND array_length(p.portfolio_urls, 1) > 0
  AND (search_category IS NULL OR search_category = ANY(p.service_categories))
  AND ST_DWithin(...)
```

Como o `RETURNS TABLE` não muda (a função já não devolvia esses campos, e a
busca não precisa devolver bio/portfolio agora — só usar como filtro), não é
necessário `DROP FUNCTION`; `CREATE OR REPLACE` basta.

## Contrato (`@amauc/shared`)

`packages/shared/src/identity/schemas.ts` ganha:

```ts
export const updateIdentityProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  municipality: z.string().trim().min(2).max(80),
});

export const updateProviderSocialProfileSchema = z.object({
  bio: z.string().trim().min(40).max(1000),
  yearsExperience: z.number().int().min(0).max(60),
  portfolioUrls: z.array(z.string()).min(1).max(6),
});
```

`identity.getProfile` passa a retornar `displayName`, `avatarUrl`,
`municipality`, `bio`, `yearsExperience`, `portfolioUrls` no payload
existente.

Dois handlers novos em `apps/api/src/rpc/identity.ts`, mesmo padrão dos
existentes (safeParse → 400 com `error.flatten()` → update filtrado por
`clerk_user_id` do JWT, auto-referenciado, sem checagem extra de ownership):
- `identity.updateProfile` — nome + município (ambos os caminhos).
- `identity.updateProviderSocialProfile` — bio + anos + portfólio (só
  caminho prestador; reforça `is_provider` como `identity.updateProviderProfile`
  já faz).

## Fluxo

1. Depois de `activateClerkSession` (sign-in **e** sign-up), busca
   `identity.getProfile`. Se `displayName` for vazio/null →
   `router.replace("/onboarding")`. Caso contrário, segue pro destino normal
   (comportamento atual inalterado).
2. `app/onboarding.tsx` (nova tela): nome + município (`updateIdentityProfileSchema`
   espelhado no client). Sem opção de pular. Depois de salvar, pergunta:
   "Quero contratar" ou "Quero oferecer serviços":
   - **Quero contratar** → `identity.updateRoles({ isContractor: true, isProvider: false })`
     (mantém o que já existia por padrão) → home.
   - **Quero oferecer serviços** → `identity.updateRoles({ isContractor: true, isProvider: true })`
     → `router.replace("/profile/provider-setup")`.
3. `app/(app)/profile/provider-setup.tsx` (existente, estendida): já coleta
   categorias + localização GPS. Ganha os campos de bio, anos de experiência
   e upload de portfólio (mínimo 1 foto) antes do botão salvar. O texto
   hardcoded `"Concórdia, SC (Detectado)"` é substituído pelo campo de
   município real vindo do passo 2 (bug pré-existente corrigido como efeito
   colateral direto da mudança, não como excursão de escopo separada).
   Salvar sem completar bio/anos/foto ainda é permitido — o perfil só não
   aparece em `search_providers` até completar (gate de visibilidade, não de
   conta). Alguém pode fechar o app no meio e retomar depois normalmente,
   entrando de novo em `/profile/provider-setup` pelo mesmo caminho "quero
   oferecer serviços" na home (ver Erros/edge cases).
4. Usuário que já é só contratante e depois clica em "oferecer serviços" (o
   botão que já existe solto na home hoje) cai na mesma
   `provider-setup.tsx` — mesma conta, D-06 preservado.
5. `(app)/_layout.tsx` ganha guard: `isSignedIn` + `displayName` vazio força
   redirect pra `/onboarding`, cobrindo deep link/histórico do navegador
   (mesmo padrão já desenhado no spec anterior de 07/08).

## Visual (NativeWind)

Telas novas/reescritas nesta spec (`onboarding.tsx`, `sign-up.tsx`,
`sign-in.tsx`, `provider-setup.tsx`) são construídas direto com NativeWind +
componentes base do React Native Reusables (`button`, `card`, `text`,
`input`), em vez de `StyleSheet`, retomando de onde a `feat/nativewind-piloto`
parou:
- **Fase 2 (tokens):** `global.css` com variáveis shadcn em HSL,
  `--primary` = verde da marca (`hsl(142 71% 23%)`), `tailwind.config.js`
  mapeando. Ainda não existe no repo — só o wiring de build (Fase 1) foi
  feito.
- **Fase 3 (componentes base):** `npx @react-native-reusables/cli add button
  card text input`, código entra em `components/ui/`.

Direção: superfície branca, neutros quentes, bordas discretas em vez de
sombra, um acento por tela, alvo de toque ≥ 44pt, contraste ≥ 4.5:1 — mesma
diretriz já registrada em `.claude/skills/design-system/SKILL.md`. Não
inventar direção nova: adotar os componentes do RNR como vêm.

O restante do app (demandas, descoberta, home fora do CTA de auth) continua
em `StyleSheet` por enquanto — migração fica para o sub-projeto de reforma
visual já esboçado em `BRIEF-MIGRACAO-UI.md` (não reescrito aqui).

## Erros e edge cases

- `identity.getProfile` falha na checagem pós-login (rede instável): trata
  como "perfil desconhecido" → manda pra onboarding mesmo assim (pior caso é
  pedir nome de novo, não travar o usuário fora do app).
- Nome/município vazio ou só espaço: Zod `.trim().min()` barra client e
  server side.
- Bio abaixo do mínimo de 40 caracteres: mensagem explícita no client
  (`"Conte um pouco mais sobre sua experiência (mínimo 40 caracteres)"`),
  evita bio tipo "trabalho bem" que não passa de fraude cosmética.
- Upload de foto falha (rede rural intermitente, ver §8 do CLAUDE.md):
  permite salvar o resto do perfil sem a foto — o gate de visibilidade em
  `search_providers` já cobre o caso de portfólio vazio, não precisa travar
  o formulário inteiro por causa de um upload.
- Onboarding não é bypassável via deep link direto pra `/demands/create` etc.
  — coberto pelo guard no `(app)/_layout.tsx` (passo 5 do Fluxo).
- Usuário existente (contas já criadas antes desta migration) com
  `display_name` null: primeiro login após o deploy cai no onboarding
  normalmente, sem tratamento especial.

## Testes

- `apps/api`: `identity.updateProfile` e `identity.updateProviderSocialProfile`
  (input válido, input inválido → 400, retorno reflete update); teste de
  `identity.getProfile` atualizado incluindo os novos campos.
- `apps/api`: teste de integração de `search_providers` confirmando que
  provider com `bio`/`portfolio_urls` vazio **não** aparece no resultado, e
  que passa a aparecer depois de completar o perfil.
- `apps/mobile`: `onboarding.tsx` (submit válido chama RPC e navega; submit
  vazio bloqueia; branch "quero contratar" vs "quero oferecer serviços").
- `apps/mobile`: guard em `(app)/_layout.tsx` (perfil sem nome redireciona
  pra onboarding mesmo entrando por rota profunda).
- `apps/mobile`: `provider-setup.tsx` estendida (bloqueia salvar sem bio
  mínima/anos/foto? — não bloqueia, ver Erros/edge cases; testa que salva
  parcialmente e que o perfil resultante não passa no filtro de
  `search_providers` até completar).

## Próximos passos (fora deste spec)

Registrados como itens de backlog separados, cada um vira seu próprio spec
quando priorizado:

- **Chat interno via Supabase Realtime** — hoje o CLAUDE.md e o `ROADMAP.md`
  (Fase 5) definem fechamento fora da plataforma como decisão deliberada de
  V1. Adicionar chat é reverter essa decisão, não só uma feature nova —
  precisa de spec próprio que reavalie essa decisão explicitamente antes de
  qualquer código.
- **PostGIS mais abrangente** — hoje só `search_providers` usa geografia.
  Precisa de spec próprio definindo exatamente quais outras queries/features
  ganhariam raio/distância (demandas por proximidade? ranking por distância
  no feed?).
- **Reforma visual do restante do app** (demandas, descoberta, perfil) no
  padrão Workana/GetNinjas/99Freelas, estendendo os tokens/componentes
  NativeWind introduzidos aqui — continuação natural do
  `BRIEF-MIGRACAO-UI.md` já existente na branch antiga, começando pela tela
  piloto que ele já define (`demands/index.tsx`).

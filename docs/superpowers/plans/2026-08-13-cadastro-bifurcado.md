# Cadastro bifurcado (contratante/prestador) + perfil social — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Após o OTP, bifurcar o cadastro por intenção (contratante-leve vs. prestador-com-perfil-social), gravar o perfil social, esconder prestadores incompletos da busca, e reconstruir as telas de auth/onboarding/provider-setup com NativeWind.

**Architecture:** Backend primeiro (migration → contratos Zod em `@amauc/shared` → handlers RPC Hono), depois fundação visual NativeWind (tokens + componentes React Native Reusables), depois telas mobile (onboarding de dois passos, guard de rota, extensão do provider-setup). Uma conta, dois papéis (D-06); o gate é de **visibilidade na busca**, não de criação de conta.

**Tech Stack:** Expo SDK 55 / RN 0.83 / React 19.2, expo-router, Clerk (OTP), Hono 4 + Drizzle, Supabase (Postgres 17 + PostGIS 3.5, Storage, RLS), Zod (`@amauc/shared`), NativeWind 4.2.6 + Tailwind 3.4.19 + React Native Reusables, Vitest (API), Jest/jest-expo (mobile).

## Global Constraints

- Branch de trabalho: `fix/cadastro-bifurcado` a partir da `main` atual (`712fac7`). Nunca commitar bug ativo direto na `main`.
- Commits: Conventional Commits, um commit = uma causa raiz. **Nunca** adicionar trailer `Co-Authored-By: Claude` nem `Claude-Session` — a avaliação acadêmica depende de autoria única (ver memória do projeto).
- Migrations são **append-only**; nunca editar migration já existente.
- `search_providers`: manter `RETURNS TABLE` inalterado → `CREATE OR REPLACE` basta (sem `DROP FUNCTION`).
- Contratos Zod vivem **só** em `@amauc/shared`; schema duplicado é bug arquitetural. Proibido `as any` / `@ts-ignore` para silenciar erro de tipo.
- NativeWind: fixar `nativewind@4.2.6` e `tailwindcss@3.4.19` (v4 quebra). Não criar `postcss.config.js`. Não adicionar `react-native-worklets/plugin`. Cor de marca só via token `--primary` (`hsl(142 71% 23%)`) — proibido `bg-[#116530]` literal.
- Test runner API: `pnpm --filter @amauc/api test` (mesmo do CI). Test runner mobile: `cd apps/mobile && pnpm test` (jest-expo) — **atenção: o CI hoje NÃO roda testes de mobile**, então os testes de mobile deste plano são verificados localmente; rode-os explicitamente antes de cada commit de tela.
- Typecheck mobile: `cd apps/mobile && pnpm typecheck`. Rodar antes de cada commit de mobile; zero erro novo.
- Diff mínimo. Preservar o fluxo OTP existente (`sign-up.tsx`/`sign-in.tsx` da `main`) — não reescrever o que já funciona.

---

## File Structure

**Migrations (novas, append-only):**
- `supabase/migrations/20260813000000_profile_social.sql` — colunas sociais + filtro de visibilidade em `search_providers`.
- `supabase/migrations/20260813000001_portfolio_storage.sql` — bucket `portfolio` + policies de ownership.

**Contratos (`@amauc/shared`):**
- `packages/shared/src/identity/schemas.ts` — +`updateIdentityProfileSchema`, +`updateProviderSocialProfileSchema`.
- `packages/shared/src/index.ts` — re-export dos novos schemas/tipos.

**API (`apps/api`):**
- `apps/api/src/lib/profile.ts` — `ProfileRow` ganha campos sociais; `getProfileByClerkUserId` seleciona-os.
- `apps/api/src/rpc/identity.ts` — `identity.getProfile` estendido; +`identity.updateProfile`; +`identity.updateProviderSocialProfile`.
- `apps/api/src/rpc/identity.test.ts` — novo arquivo de teste unitário dos handlers de identidade.

**Fundação visual (`apps/mobile`):**
- `apps/mobile/babel.config.js`, `metro.config.js`, `tsconfig.json`, `nativewind-env.d.ts`, `global.css`, `tailwind.config.js`, `app/_layout.tsx` — wiring NativeWind (portado de `bd2a010`).
- `apps/mobile/components/ui/` — componentes base do React Native Reusables (`button`, `card`, `text`, `input`).

**Telas/hooks mobile:**
- `apps/mobile/hooks/use-onboarding-status.ts` — deriva "precisa de onboarding" de `identity.getProfile`.
- `apps/mobile/app/onboarding.tsx` — dois passos: nome+município → escolha de papel.
- `apps/mobile/app/(app)/_layout.tsx` — guard de onboarding.
- `apps/mobile/app/(auth)/sign-in.tsx` / `sign-up.tsx` — redirect pós-login condicionado ao onboarding.
- `apps/mobile/app/(app)/profile/provider-setup.tsx` — +município real, +bio, +anos de experiência, +upload de portfólio.

**Testes mobile:** `apps/mobile/hooks/__tests__/use-onboarding-status.test.ts`, `app/__tests__/onboarding.test.tsx`, `app/(app)/__tests__/_layout.test.tsx`.

---

### Task 1: Branch + wiring de build do NativeWind

Porta o commit `bd2a010` da branch `feat/nativewind-piloto` (Gate 1: pipeline compila `className`). É pré-requisito de toda tela NativeWind.

**Files:**
- Create: `apps/mobile/global.css`, `apps/mobile/tailwind.config.js`, `apps/mobile/nativewind-env.d.ts`
- Modify: `apps/mobile/babel.config.js`, `apps/mobile/metro.config.js`, `apps/mobile/tsconfig.json`, `apps/mobile/package.json`, `apps/mobile/app/_layout.tsx`, `pnpm-lock.yaml`
- Create (temporário): probe visual removido no fim da task

**Interfaces:**
- Produces: pipeline Metro/Babel que compila classes `className` via NativeWind; `global.css` importado em `app/_layout.tsx`.

- [ ] **Step 1: Criar a branch a partir da main atual**

```bash
git checkout main
git rev-parse HEAD   # confirme que é 712fac7...
git checkout -b fix/cadastro-bifurcado
```

- [ ] **Step 2: Instalar dependências NativeWind (versões fixas)**

```bash
cd apps/mobile
npx expo install nativewind@4.2.6 react-native-reanimated react-native-safe-area-context
pnpm add -D tailwindcss@3.4.19 prettier-plugin-tailwindcss
cd ../..
```

Expected: `apps/mobile/package.json` passa a listar `nativewind@4.2.6` e `tailwindcss` `3.4.19` (devDep). Não instalar Tailwind 4.x.

- [ ] **Step 3: Configurar Babel**

Substituir todo o conteúdo de `apps/mobile/babel.config.js` por:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
  };
};
```

- [ ] **Step 4: Configurar Metro**

Substituir `apps/mobile/metro.config.js` por:

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
```

- [ ] **Step 5: Criar entrada de estilos e tipos**

`apps/mobile/global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`apps/mobile/nativewind-env.d.ts`:

```ts
/// <reference types="nativewind/types" />
```

`apps/mobile/tailwind.config.js` (mínimo para Gate 1 — tokens completos vêm na Task 7):

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 6: Incluir tipos do NativeWind no tsconfig e importar global.css**

Em `apps/mobile/tsconfig.json`, garantir que `nativewind-env.d.ts` é incluído (adicionar ao array `include` se existir, ex.: `"include": ["**/*.ts", "**/*.tsx", "nativewind-env.d.ts"]`).

No topo de `apps/mobile/app/_layout.tsx`, adicionar a primeira linha de import:

```ts
import "../global.css";
```

- [ ] **Step 7: Limpar cache e subir Web com probe**

Adicionar temporariamente na home (`apps/mobile/app/index.tsx`), dentro do JSX raiz, um probe:

```tsx
<View testID="nativewind-gate1-probe" className="bg-red-500 h-10" />
```

Rodar:

```bash
cd apps/mobile
rm -rf node_modules/.cache .expo
pnpm web
```

Expected: app sobe sem erro e o probe renderiza uma barra vermelha (confirma que `className` compila pelo pipeline real).

- [ ] **Step 8: Remover o probe e rodar typecheck**

Remover a linha do probe de `app/index.tsx`.

```bash
cd apps/mobile && pnpm typecheck
```

Expected: sem erro novo.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/babel.config.js apps/mobile/metro.config.js apps/mobile/tsconfig.json \
  apps/mobile/nativewind-env.d.ts apps/mobile/global.css apps/mobile/tailwind.config.js \
  apps/mobile/app/_layout.tsx apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat(mobile): wire NativeWind pilot into build pipeline"
```

---

### Task 2: Migration — colunas sociais + filtro de visibilidade em search_providers

**Files:**
- Create: `supabase/migrations/20260813000000_profile_social.sql`

**Interfaces:**
- Produces: colunas `display_name`, `avatar_url`, `municipality`, `bio`, `years_experience`, `portfolio_urls` em `public.profiles`; `search_providers` passa a exigir `bio` preenchida e ao menos 1 item em `portfolio_urls`.

- [ ] **Step 1: Escrever a migration**

Ler primeiro `supabase/migrations/20260428000001_profiles_discovery.sql` (definição atual de `search_providers`) para copiar o corpo verbatim antes de adicionar o filtro. Criar `supabase/migrations/20260813000000_profile_social.sql`:

```sql
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
```

> Nota: copie o corpo `SELECT ... ST_DWithin(...) ORDER BY` da migration `20260428000001` verbatim, ajustando **apenas** as duas linhas de filtro novas (`p.bio IS NOT NULL` e `array_length(...)`). Se o corpo original divergir do mostrado aqui, o original manda.

- [ ] **Step 2: Aplicar a migration no Supabase de teste/dev**

```bash
supabase db push
```

Expected: migration aplica sem erro; `search_providers` recriada.

- [ ] **Step 3: Verificar manualmente o gate (evidência, não afirmação)**

Rodar no SQL editor / psql do projeto de teste:

```sql
-- Prestador sem bio/portfolio NÃO deve aparecer:
select clerk_user_id from public.search_providers(-27.23, -52.03, null, 200);
```

Expected: prestadores com `bio IS NULL` ou `portfolio_urls` vazio não constam no resultado. Colar a saída como evidência.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260813000000_profile_social.sql
git commit -m "feat(db): add social profile columns and gate search_providers on completeness"
```

---

### Task 3: Migration — bucket de Storage `portfolio` + policies

**Files:**
- Create: `supabase/migrations/20260813000001_portfolio_storage.sql`

**Interfaces:**
- Produces: bucket público `portfolio`; escrita restrita a objetos sob o prefixo `{clerk_user_id}/` do próprio usuário.

- [ ] **Step 1: Escrever a migration**

`supabase/migrations/20260813000001_portfolio_storage.sql`:

```sql
-- Bucket de fotos de portfólio do prestador. Leitura pública (as fotos
-- aparecem na busca do contratante); escrita só do dono, sob seu próprio
-- prefixo {clerk_user_id}/ — mesmo padrão de ownership das policies de profiles.
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "portfolio_read_public"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'portfolio');

CREATE POLICY "portfolio_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio'
    AND (storage.foldername(name))[1] = (auth.jwt()->>'sub')
  );

CREATE POLICY "portfolio_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'portfolio'
    AND (storage.foldername(name))[1] = (auth.jwt()->>'sub')
  );

CREATE POLICY "portfolio_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'portfolio'
    AND (storage.foldername(name))[1] = (auth.jwt()->>'sub')
  );
```

- [ ] **Step 2: Aplicar e verificar**

```bash
supabase db push
```

Expected: bucket `portfolio` criado; 4 policies criadas sem erro. Se `supabase db push` reclamar de policy já existente numa re-execução, é sinal de que a migration não é idempotente — nesse caso confirmar que é a primeira aplicação (append-only, não re-editar).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260813000001_portfolio_storage.sql
git commit -m "feat(db): add portfolio storage bucket with owner-scoped write policies"
```

---

### Task 4: Contratos Zod em `@amauc/shared`

**Files:**
- Modify: `packages/shared/src/identity/schemas.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/identity/schemas.test.ts` (criar)

**Interfaces:**
- Produces:
  - `updateIdentityProfileSchema` = `z.object({ displayName: z.string().trim().min(2).max(80), municipality: z.string().trim().min(2).max(80) })`, tipo `UpdateIdentityProfileInput`.
  - `updateProviderSocialProfileSchema` = `z.object({ bio: z.string().trim().min(40).max(1000), yearsExperience: z.number().int().min(0).max(60), portfolioUrls: z.array(z.string()).min(1).max(6) })`, tipo `UpdateProviderSocialProfileInput`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `packages/shared/src/identity/schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  updateIdentityProfileSchema,
  updateProviderSocialProfileSchema,
} from "./schemas";

describe("updateIdentityProfileSchema", () => {
  it("accepts a valid name and municipality", () => {
    const result = updateIdentityProfileSchema.safeParse({
      displayName: "Maria Souza",
      municipality: "Concórdia",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a blank name", () => {
    const result = updateIdentityProfileSchema.safeParse({
      displayName: " ",
      municipality: "Concórdia",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing municipality", () => {
    const result = updateIdentityProfileSchema.safeParse({ displayName: "Maria" });
    expect(result.success).toBe(false);
  });
});

describe("updateProviderSocialProfileSchema", () => {
  const validBio =
    "Trabalho com roçada e capina há vários anos na região de Concórdia.";

  it("accepts a complete social profile", () => {
    const result = updateProviderSocialProfileSchema.safeParse({
      bio: validBio,
      yearsExperience: 5,
      portfolioUrls: ["user_1/photo1.jpg"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a bio shorter than 40 chars", () => {
    const result = updateProviderSocialProfileSchema.safeParse({
      bio: "trabalho bem",
      yearsExperience: 5,
      portfolioUrls: ["user_1/photo1.jpg"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty portfolio", () => {
    const result = updateProviderSocialProfileSchema.safeParse({
      bio: validBio,
      yearsExperience: 5,
      portfolioUrls: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative years of experience", () => {
    const result = updateProviderSocialProfileSchema.safeParse({
      bio: validBio,
      yearsExperience: -1,
      portfolioUrls: ["user_1/photo1.jpg"],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
pnpm --filter @amauc/shared exec vitest run src/identity/schemas.test.ts
```

Expected: FAIL — `updateIdentityProfileSchema`/`updateProviderSocialProfileSchema` não existem.

> Se `@amauc/shared` não tiver script de teste próprio, rodar via raiz: `pnpm --filter @amauc/shared exec vitest run`. Se nem `vitest` estiver disponível no pacote shared, mover este teste para `apps/api` (que já tem Vitest) importando de `@amauc/shared` — o contrato é o mesmo.

- [ ] **Step 3: Implementar os schemas**

Adicionar ao final de `packages/shared/src/identity/schemas.ts`:

```ts
export const updateIdentityProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  municipality: z.string().trim().min(2).max(80),
});

export type UpdateIdentityProfileInput = z.infer<typeof updateIdentityProfileSchema>;

export const updateProviderSocialProfileSchema = z.object({
  bio: z.string().trim().min(40).max(1000),
  yearsExperience: z.number().int().min(0).max(60),
  portfolioUrls: z.array(z.string()).min(1).max(6),
});

export type UpdateProviderSocialProfileInput = z.infer<
  typeof updateProviderSocialProfileSchema
>;
```

- [ ] **Step 4: Re-exportar de `index.ts`**

Em `packages/shared/src/index.ts`, estender o bloco de export de `./identity/schemas`:

```ts
export {
  profileRoleFlagsSchema,
  type ProfileRoleFlagsInput,
  updateIdentityProfileSchema,
  type UpdateIdentityProfileInput,
  updateProviderSocialProfileSchema,
  type UpdateProviderSocialProfileInput,
} from "./identity/schemas";
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

```bash
pnpm --filter @amauc/shared exec vitest run src/identity/schemas.test.ts
```

Expected: PASS (todos os casos).

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/identity/schemas.ts packages/shared/src/index.ts packages/shared/src/identity/schemas.test.ts
git commit -m "feat(shared): add identity and provider social profile contracts"
```

---

### Task 5: Handlers de identidade na API

`getProfileByClerkUserId` passa a trazer os campos sociais; `identity.getProfile` os devolve; novos handlers `identity.updateProfile` e `identity.updateProviderSocialProfile`.

**Files:**
- Modify: `apps/api/src/lib/profile.ts`
- Modify: `apps/api/src/rpc/identity.ts`
- Test: `apps/api/src/rpc/identity.test.ts` (criar)

**Interfaces:**
- Consumes: `updateIdentityProfileSchema`, `updateProviderSocialProfileSchema` (Task 4); `getAuthUser(c)` → `{ userId }`; `getSupabaseAdmin()`.
- Produces: procedimentos RPC `identity.updateProfile` e `identity.updateProviderSocialProfile`; `identity.getProfile` retornando `displayName`, `avatarUrl`, `municipality`, `bio`, `yearsExperience`, `portfolioUrls`.

- [ ] **Step 1: Estender `ProfileRow` e o select em `profile.ts`**

Em `apps/api/src/lib/profile.ts`, estender o tipo e a query de `getProfileByClerkUserId`:

```ts
export type ProfileRow = {
  clerk_user_id: string;
  is_contractor: boolean;
  is_provider: boolean;
  service_categories?: string[];
  display_name?: string | null;
  avatar_url?: string | null;
  municipality?: string | null;
  bio?: string | null;
  years_experience?: number | null;
  portfolio_urls?: string[] | null;
};
```

Na função `getProfileByClerkUserId`, trocar o `.select(...)` por:

```ts
    .select(
      "clerk_user_id, is_contractor, is_provider, service_categories, display_name, avatar_url, municipality, bio, years_experience, portfolio_urls"
    )
```

E o fallback (quando `data` é null) passa a incluir os novos campos como null/vazio:

```ts
  return (
    data ?? {
      clerk_user_id: userId,
      is_contractor: true,
      is_provider: false,
      service_categories: [],
      display_name: null,
      avatar_url: null,
      municipality: null,
      bio: null,
      years_experience: null,
      portfolio_urls: [],
    }
  );
```

- [ ] **Step 2: Escrever o teste que falha**

Criar `apps/api/src/rpc/identity.test.ts` (mesmo padrão de mock de `rpc-features.test.ts`):

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = { userId: "user_test_123", sessionId: "sess_test" };
const fromMock = vi.fn();

function chainable(resolver: () => unknown) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.update = vi.fn(self);
  chain.single = vi.fn(resolver);
  chain.maybeSingle = vi.fn(resolver);
  return chain;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: fromMock, rpc: vi.fn() }),
}));

vi.mock("../middleware/clerk.js", () => ({
  getAuthUser: () => ({ userId: authState.userId, sessionId: authState.sessionId }),
  requireClerkAuth: async (c: any, next: any) => {
    c.set("authUser", { userId: authState.userId, sessionId: authState.sessionId });
    await next();
  },
}));

import { app } from "../index.js";

function post(procedure: string, input: unknown) {
  return app.request("/rpc", {
    method: "POST",
    headers: { authorization: "Bearer test-token", "content-type": "application/json" },
    body: JSON.stringify({ procedure, input }),
  });
}

describe("Identity RPC", () => {
  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = "test_secret_key";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_key";
    vi.clearAllMocks();
  });

  it("getProfile returns social fields", async () => {
    fromMock.mockImplementation(() =>
      chainable(() =>
        Promise.resolve({
          data: {
            clerk_user_id: authState.userId,
            is_contractor: true,
            is_provider: false,
            service_categories: [],
            display_name: "Maria Souza",
            avatar_url: null,
            municipality: "Concórdia",
            bio: null,
            years_experience: null,
            portfolio_urls: [],
          },
          error: null,
        })
      )
    );

    const res = await post("identity.getProfile", {});
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.displayName).toBe("Maria Souza");
    expect(data.municipality).toBe("Concórdia");
  });

  it("updateProfile persists name and municipality", async () => {
    fromMock.mockImplementation(() => {
      const updateChain = chainable(() =>
        Promise.resolve({
          data: {
            clerk_user_id: authState.userId,
            display_name: "Maria Souza",
            municipality: "Concórdia",
          },
          error: null,
        })
      );
      return {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ select: vi.fn(() => ({ single: updateChain.single })) })),
        })),
      };
    });

    const res = await post("identity.updateProfile", {
      displayName: "Maria Souza",
      municipality: "Concórdia",
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.displayName).toBe("Maria Souza");
  });

  it("updateProfile rejects a blank name with 400", async () => {
    const res = await post("identity.updateProfile", { displayName: " ", municipality: "X" });
    expect(res.status).toBe(400);
  });

  it("updateProviderSocialProfile rejects when caller is not a provider (403)", async () => {
    fromMock.mockImplementation(() =>
      chainable(() => Promise.resolve({ data: { is_provider: false }, error: null }))
    );

    const res = await post("identity.updateProviderSocialProfile", {
      bio: "Trabalho com roçada e capina há vários anos na região de Concórdia.",
      yearsExperience: 5,
      portfolioUrls: ["user_test_123/p1.jpg"],
    });
    expect(res.status).toBe(403);
  });

  it("updateProviderSocialProfile rejects a short bio with 400", async () => {
    const res = await post("identity.updateProviderSocialProfile", {
      bio: "curto",
      yearsExperience: 5,
      portfolioUrls: ["user_test_123/p1.jpg"],
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

```bash
pnpm --filter @amauc/api test -- identity.test.ts
```

Expected: FAIL — handlers `identity.updateProfile` / `identity.updateProviderSocialProfile` desconhecidos (RPC responde 400 "Unknown procedure") e/ou `getProfile` não retorna `municipality`.

- [ ] **Step 4: Implementar os handlers**

Em `apps/api/src/rpc/identity.ts`:

Atualizar o import de `@amauc/shared`:

```ts
import {
  profileRoleFlagsSchema,
  updateProviderProfileSchema,
  updateIdentityProfileSchema,
  updateProviderSocialProfileSchema,
} from "@amauc/shared";
```

Substituir o corpo de `"identity.getProfile"` por:

```ts
  "identity.getProfile": async (c: Context) => {
    const auth = getAuthUser(c);
    const profile = await getProfileByClerkUserId(auth.userId);
    return c.json({
      clerkUserId: profile.clerk_user_id,
      isContractor: profile.is_contractor,
      isProvider: profile.is_provider,
      serviceCategories: profile.service_categories ?? [],
      displayName: profile.display_name ?? null,
      avatarUrl: profile.avatar_url ?? null,
      municipality: profile.municipality ?? null,
      bio: profile.bio ?? null,
      yearsExperience: profile.years_experience ?? null,
      portfolioUrls: profile.portfolio_urls ?? [],
    });
  },
```

Adicionar dois handlers novos ao objeto `identityHandlers` (após `identity.updateRoles`):

```ts
  "identity.updateProfile": async (c: Context, input: unknown) => {
    const auth = getAuthUser(c);
    const parsed = updateIdentityProfileSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        display_name: parsed.data.displayName,
        municipality: parsed.data.municipality,
        updated_at: new Date().toISOString(),
      })
      .eq("clerk_user_id", auth.userId)
      .select("clerk_user_id, display_name, municipality")
      .single();

    if (error) {
      return c.json({ error: "Database error", details: error.message }, 500);
    }

    return c.json({
      clerkUserId: data.clerk_user_id,
      displayName: data.display_name,
      municipality: data.municipality,
    });
  },

  "identity.updateProviderSocialProfile": async (c: Context, input: unknown) => {
    const auth = getAuthUser(c);
    const parsed = updateProviderSocialProfileSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const supabase = getSupabaseAdmin();

    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("is_provider")
      .eq("clerk_user_id", auth.userId)
      .single();

    if (fetchError || !profile?.is_provider) {
      return c.json({ error: "Only providers can update social profile" }, 403);
    }

    const { bio, yearsExperience, portfolioUrls } = parsed.data;
    const { data, error } = await supabase
      .from("profiles")
      .update({
        bio,
        years_experience: yearsExperience,
        portfolio_urls: portfolioUrls,
        updated_at: new Date().toISOString(),
      })
      .eq("clerk_user_id", auth.userId)
      .select("clerk_user_id, bio, years_experience, portfolio_urls")
      .single();

    if (error) {
      return c.json({ error: "Database error", details: error.message }, 500);
    }

    return c.json({
      clerkUserId: data.clerk_user_id,
      bio: data.bio,
      yearsExperience: data.years_experience,
      portfolioUrls: data.portfolio_urls,
    });
  },
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

```bash
pnpm --filter @amauc/api test
```

Expected: PASS — a suíte inteira (identity + demands + discovery + roles) verde, zero regressão.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/profile.ts apps/api/src/rpc/identity.ts apps/api/src/rpc/identity.test.ts
git commit -m "feat(api): extend getProfile and add updateProfile/updateProviderSocialProfile handlers"
```

---

### Task 6: Tokens visuais NativeWind (Fase 2)

**Files:**
- Modify: `apps/mobile/global.css`, `apps/mobile/tailwind.config.js`

**Interfaces:**
- Produces: classes semânticas `bg-primary`, `bg-background`, `text-foreground`, `border-border` etc. mapeadas para variáveis shadcn; `--primary` = verde da marca.

- [ ] **Step 1: Definir as variáveis de tema em `global.css`**

Substituir `apps/mobile/global.css` por (variáveis shadcn em HSL; verde da marca `#116530` = `hsl(142 71% 23%)`):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 12%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 12%;
    --primary: 142 71% 23%;
    --primary-foreground: 0 0% 100%;
    --secondary: 40 20% 96%;
    --secondary-foreground: 240 10% 12%;
    --muted: 40 20% 96%;
    --muted-foreground: 240 5% 45%;
    --border: 240 6% 90%;
    --input: 240 6% 90%;
    --destructive: 0 72% 45%;
    --destructive-foreground: 0 0% 100%;
    --radius: 0.625rem;
  }

  .dark:root {
    --background: 240 10% 8%;
    --foreground: 0 0% 98%;
    --card: 240 10% 10%;
    --card-foreground: 0 0% 98%;
    --primary: 142 60% 40%;
    --primary-foreground: 0 0% 100%;
    --secondary: 240 6% 16%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 6% 16%;
    --muted-foreground: 240 5% 65%;
    --border: 240 6% 20%;
    --input: 240 6% 20%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
  }
}
```

- [ ] **Step 2: Mapear as variáveis em `tailwind.config.js`**

Substituir `apps/mobile/tailwind.config.js` por:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: Verificar os tokens (Gate 2)**

Adicionar temporariamente na home dois probes: `<View className="bg-primary h-10" />` e `<View className="border border-border h-10" />`. Rodar:

```bash
cd apps/mobile && rm -rf node_modules/.cache .expo && pnpm web
```

Expected: `bg-primary` renderiza o verde da marca; `border-border` renderiza a borda neutra. Remover os probes depois.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/global.css apps/mobile/tailwind.config.js
git commit -m "feat(mobile): add shadcn design tokens for NativeWind"
```

---

### Task 7: Componentes base (React Native Reusables — Fase 3)

**Files:**
- Create: `apps/mobile/components/ui/button.tsx`, `card.tsx`, `text.tsx`, `input.tsx` (gerados pela CLI do RNR) e quaisquer utilitários que a CLI adicionar (ex.: `lib/utils.ts`).

**Interfaces:**
- Produces: componentes `Button`, `Card`, `Text`, `Input` em `components/ui/` estilizados pelos tokens da Task 6. (Mantém `components/Button.tsx` legado intacto — coexistência intencional durante a migração.)

- [ ] **Step 1: Gerar os componentes**

```bash
cd apps/mobile
npx @react-native-reusables/cli@latest add button card text input
cd ../..
```

Expected: arquivos criados em `components/ui/`. Se a CLI pedir para configurar `components.json`/aliases, aceitar os defaults apontando para `components/ui`.

- [ ] **Step 2: Renderizar cada componente numa tela de teste**

Criar temporariamente `apps/mobile/app/_ui-probe.tsx` importando e renderizando `Button`, `Card`, `Text`, `Input` de `../components/ui/*`. Rodar `pnpm web` e confirmar que renderizam com a estética neutra do RNR (nas três plataformas se possível: iOS, Android, Web).

Expected: componentes renderizam sem erro. Remover `_ui-probe.tsx` depois.

- [ ] **Step 3: Typecheck**

```bash
cd apps/mobile && pnpm typecheck
```

Expected: sem erro novo.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/components/ui apps/mobile/components.json apps/mobile/lib 2>/dev/null
git commit -m "feat(mobile): add React Native Reusables base components (button, card, text, input)"
```

---

### Task 8: Hook `use-onboarding-status`

**Files:**
- Create: `apps/mobile/hooks/use-onboarding-status.ts`
- Test: `apps/mobile/hooks/__tests__/use-onboarding-status.test.ts`

**Interfaces:**
- Consumes: `identity.getProfile` (Task 5) via `useRpcWithDevMode().callRpc`; `useEffectiveUserId()` → `{ userId, isReady }`.
- Produces: `useOnboardingStatus(): { needsOnboarding: boolean | null; isReady: boolean }`. `needsOnboarding` é `true` quando `displayName` está vazio.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/mobile/hooks/__tests__/use-onboarding-status.test.ts`:

```ts
import { renderHook, waitFor } from "@testing-library/react-native";

const mockCallRpc = jest.fn();

jest.mock("../use-effective-user-id", () => ({
  useEffectiveUserId: () => ({ userId: "user_test_123", isReady: true }),
}));
jest.mock("../use-rpc-with-dev-mode", () => ({
  useRpcWithDevMode: () => ({ callRpc: mockCallRpc }),
}));

import { useOnboardingStatus } from "../use-onboarding-status";

describe("useOnboardingStatus", () => {
  beforeEach(() => mockCallRpc.mockReset());

  it("needsOnboarding = true when displayName is empty", async () => {
    mockCallRpc.mockResolvedValue({ displayName: null });
    const { result } = renderHook(() => useOnboardingStatus());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.needsOnboarding).toBe(true);
  });

  it("needsOnboarding = false when displayName is set", async () => {
    mockCallRpc.mockResolvedValue({ displayName: "Maria" });
    const { result } = renderHook(() => useOnboardingStatus());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.needsOnboarding).toBe(false);
  });

  it("treats an RPC failure as needing onboarding", async () => {
    mockCallRpc.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useOnboardingStatus());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.needsOnboarding).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
cd apps/mobile && pnpm test -- use-onboarding-status
```

Expected: FAIL — módulo `../use-onboarding-status` não existe.

- [ ] **Step 3: Implementar o hook**

Criar `apps/mobile/hooks/use-onboarding-status.ts` (portado de `feat/nativewind-piloto`, inalterado):

```ts
import { useEffect, useState } from "react";
import { useEffectiveUserId } from "./use-effective-user-id";
import { useRpcWithDevMode } from "./use-rpc-with-dev-mode";

export type OnboardingStatus = {
  /** null enquanto ainda não sabemos (RPC em andamento) */
  needsOnboarding: boolean | null;
  isReady: boolean;
};

/**
 * Consumido por (app)/_layout.tsx (bloqueia rotas logadas) e por
 * app/onboarding.tsx (evita reexibir a tela pra quem já preencheu o nome).
 */
export function useOnboardingStatus(): OnboardingStatus {
  const { userId, isReady: authReady } = useEffectiveUserId();
  const { callRpc } = useRpcWithDevMode();
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (!authReady || !userId) return;

    let cancelled = false;
    callRpc<{ displayName?: string | null }>("identity.getProfile")
      .then((profile) => {
        if (!cancelled) setNeedsOnboarding(!profile.displayName);
      })
      .catch((error) => {
        console.error("[use-onboarding-status.check] Failed to load profile", error);
        if (!cancelled) setNeedsOnboarding(true);
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, userId, callRpc]);

  return { needsOnboarding, isReady: authReady && needsOnboarding !== null };
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
cd apps/mobile && pnpm test -- use-onboarding-status
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/hooks/use-onboarding-status.ts apps/mobile/hooks/__tests__/use-onboarding-status.test.ts
git commit -m "feat(mobile): add useOnboardingStatus hook"
```

---

### Task 9: Tela de onboarding (nome + município → escolha de papel)

**Files:**
- Create: `apps/mobile/app/onboarding.tsx`
- Test: `apps/mobile/app/__tests__/onboarding.test.tsx`

**Interfaces:**
- Consumes: `useOnboardingStatus` (Task 8); `identity.updateProfile` (Task 5); `identity.updateRoles` (existente); componentes `components/ui/*` (Task 7); `useToast` de `../components`.
- Produces: rota `/onboarding`. Passo 1 coleta `displayName` + `municipality` e chama `identity.updateProfile`. Passo 2: "Quero contratar" → `updateRoles({isContractor:true,isProvider:false})` → `/`; "Quero oferecer serviços" → `updateRoles({isContractor:true,isProvider:true})` → `/profile/provider-setup`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/mobile/app/__tests__/onboarding.test.tsx`:

```tsx
import * as React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockReplace = jest.fn();
const mockCallRpc = jest.fn();

jest.mock("expo-router", () => ({
  Redirect: () => null,
  useRouter: () => ({ replace: mockReplace }),
}));
jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
}));
jest.mock("../../hooks/use-onboarding-status", () => ({
  useOnboardingStatus: () => ({ needsOnboarding: true, isReady: true }),
}));
jest.mock("../../hooks/use-rpc-with-dev-mode", () => ({
  useRpcWithDevMode: () => ({ callRpc: mockCallRpc }),
}));
jest.mock("../../components", () => ({
  ...jest.requireActual("../../components"),
  useToast: () => ({ showToast: jest.fn() }),
}));

import OnboardingScreen from "../onboarding";

describe("OnboardingScreen", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockCallRpc.mockReset();
  });

  it("saves name + municipality and routes home for the contractor path", async () => {
    mockCallRpc.mockResolvedValue({ clerkUserId: "user_test_123", displayName: "Maria Souza" });

    const { getByPlaceholderText, getByText } = await render(<OnboardingScreen />);
    await fireEvent.changeText(getByPlaceholderText("Seu nome"), "Maria Souza");
    await fireEvent.changeText(getByPlaceholderText("Sua cidade"), "Concórdia");
    await fireEvent.press(getByText("Continuar"));

    await waitFor(() =>
      expect(mockCallRpc).toHaveBeenCalledWith("identity.updateProfile", {
        displayName: "Maria Souza",
        municipality: "Concórdia",
      }),
    );

    await fireEvent.press(await waitFor(() => getByText("Quero contratar")));

    await waitFor(() =>
      expect(mockCallRpc).toHaveBeenCalledWith("identity.updateRoles", {
        isContractor: true,
        isProvider: false,
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("routes to provider setup for the provider path", async () => {
    mockCallRpc.mockResolvedValue({ clerkUserId: "user_test_123", displayName: "João" });

    const { getByPlaceholderText, getByText } = await render(<OnboardingScreen />);
    await fireEvent.changeText(getByPlaceholderText("Seu nome"), "João Pedro");
    await fireEvent.changeText(getByPlaceholderText("Sua cidade"), "Seara");
    await fireEvent.press(getByText("Continuar"));

    await fireEvent.press(await waitFor(() => getByText("Quero oferecer serviços")));

    await waitFor(() =>
      expect(mockCallRpc).toHaveBeenCalledWith("identity.updateRoles", {
        isContractor: true,
        isProvider: true,
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith("/profile/provider-setup");
  });

  it("blocks submit when name or municipality is empty", async () => {
    const { getByText } = await render(<OnboardingScreen />);
    await fireEvent.press(getByText("Continuar"));
    expect(mockCallRpc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
cd apps/mobile && pnpm test -- onboarding
```

Expected: FAIL — módulo `../onboarding` não existe.

- [ ] **Step 3: Implementar a tela com NativeWind**

Criar `apps/mobile/app/onboarding.tsx`:

```tsx
import { useState } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { Redirect, useRouter } from "expo-router";
import { View } from "react-native";
import { useOnboardingStatus } from "../hooks/use-onboarding-status";
import { useRpcWithDevMode } from "../hooks/use-rpc-with-dev-mode";
import { useToast } from "../components";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Text } from "../components/ui/text";

type Step = "identity" | "role";

export default function OnboardingScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { needsOnboarding, isReady } = useOnboardingStatus();
  const { callRpc } = useRpcWithDevMode();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>("identity");
  const [name, setName] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;
  if (isReady && !needsOnboarding) return <Redirect href="/" />;

  async function handleContinue() {
    const trimmedName = name.trim();
    const trimmedCity = municipality.trim();
    if (trimmedName.length < 2) {
      showToast("Digite seu nome (mínimo 2 letras).", "error");
      return;
    }
    if (trimmedCity.length < 2) {
      showToast("Informe sua cidade.", "error");
      return;
    }

    setSaving(true);
    try {
      await callRpc("identity.updateProfile", {
        displayName: trimmedName,
        municipality: trimmedCity,
      });
      setStep("role");
    } catch (error: any) {
      showToast(error.message ?? "Não foi possível salvar seus dados.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function chooseRole(isProvider: boolean) {
    setSaving(true);
    try {
      await callRpc("identity.updateRoles", { isContractor: true, isProvider });
      router.replace(isProvider ? "/profile/provider-setup" : "/");
    } catch (error: any) {
      showToast(error.message ?? "Não foi possível salvar sua escolha.", "error");
      setSaving(false);
    }
  }

  if (step === "role") {
    return (
      <View className="flex-1 justify-center gap-4 bg-background p-6">
        <Text className="text-2xl font-bold text-foreground">
          Como você quer usar o Opus Freelas?
        </Text>
        <Text className="text-base text-muted-foreground">
          Você pode ativar o outro papel a qualquer momento no seu perfil.
        </Text>
        <Button size="lg" disabled={saving} onPress={() => chooseRole(false)}>
          <Text>Quero contratar</Text>
        </Button>
        <Button size="lg" variant="secondary" disabled={saving} onPress={() => chooseRole(true)}>
          <Text>Quero oferecer serviços</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center gap-4 bg-background p-6">
      <Text className="text-2xl font-bold text-foreground">Bem-vindo!</Text>
      <Text className="text-base text-muted-foreground">
        Esses dados aparecem pra quem você contratar ou pra quem contratar você.
      </Text>
      <Input placeholder="Seu nome" autoCapitalize="words" value={name} onChangeText={setName} />
      <Input
        placeholder="Sua cidade"
        autoCapitalize="words"
        value={municipality}
        onChangeText={setMunicipality}
      />
      <Button size="lg" disabled={saving} onPress={handleContinue}>
        <Text>Continuar</Text>
      </Button>
    </View>
  );
}
```

> Nota: se a API do `Button`/`Input`/`Text` gerado pelo RNR na Task 7 diferir (ex.: `Button` aceitar `label` em vez de children, ou `Input` expor outra prop de handler), ajustar as chamadas para a assinatura real gerada — os componentes de `components/ui/` são a fonte de verdade. Manter os textos ("Continuar", "Quero contratar", "Quero oferecer serviços", placeholders "Seu nome"/"Sua cidade") idênticos, pois o teste depende deles.

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
cd apps/mobile && pnpm test -- onboarding
```

Expected: PASS (3 casos).

- [ ] **Step 5: Typecheck e commit**

```bash
cd apps/mobile && pnpm typecheck
cd ../..
git add apps/mobile/app/onboarding.tsx apps/mobile/app/__tests__/onboarding.test.tsx
git commit -m "feat(mobile): add two-step onboarding (identity + role choice)"
```

---

### Task 10: Guard de onboarding no layout logado + redirect pós-login

**Files:**
- Modify: `apps/mobile/app/(app)/_layout.tsx`
- Modify: `apps/mobile/app/(auth)/sign-in.tsx`, `apps/mobile/app/(auth)/sign-up.tsx`
- Test: `apps/mobile/app/(app)/__tests__/_layout.test.tsx`

**Interfaces:**
- Consumes: `useOnboardingStatus` (Task 8).
- Produces: qualquer rota sob `(app)` redireciona pra `/onboarding` se `needsOnboarding`; login/cadastro que resultam em `displayName` vazio caem em `/onboarding`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/mobile/app/(app)/__tests__/_layout.test.tsx`:

```tsx
import * as React from "react";
import { render } from "@testing-library/react-native";

jest.mock("expo-router", () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require("react-native");
    return <Text>redirect:{href}</Text>;
  },
  Stack: () => {
    const { Text } = require("react-native");
    return <Text>stack</Text>;
  },
}));
jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
}));
jest.mock("../../../hooks/use-development-mode", () => ({
  useDevelopmentMode: () => ({ isDevMode: false, isLoading: false }),
}));

describe("AppGroupLayout onboarding guard", () => {
  beforeEach(() => jest.resetModules());

  it("renders the stack when onboarding is complete", async () => {
    jest.doMock("../../../hooks/use-onboarding-status", () => ({
      useOnboardingStatus: () => ({ needsOnboarding: false, isReady: true }),
    }));
    const AppGroupLayout = require("../_layout").default;
    const { getByText } = await render(<AppGroupLayout />);
    expect(getByText("stack")).toBeTruthy();
  });

  it("redirects to /onboarding when the profile needs onboarding", async () => {
    jest.doMock("../../../hooks/use-onboarding-status", () => ({
      useOnboardingStatus: () => ({ needsOnboarding: true, isReady: true }),
    }));
    const AppGroupLayout = require("../_layout").default;
    const { getByText } = await render(<AppGroupLayout />);
    expect(getByText("redirect:/onboarding")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
cd apps/mobile && pnpm test -- "_layout"
```

Expected: FAIL — o layout ainda não consulta `useOnboardingStatus` (segundo caso não redireciona).

- [ ] **Step 3: Adicionar o guard no `(app)/_layout.tsx`**

Substituir `apps/mobile/app/(app)/_layout.tsx` por:

```tsx
import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useDevelopmentMode } from "../../hooks/use-development-mode";
import { useOnboardingStatus } from "../../hooks/use-onboarding-status";

export default function AppGroupLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isDevMode, isLoading: devModeLoading } = useDevelopmentMode();
  const { needsOnboarding, isReady: onboardingReady } = useOnboardingStatus();

  if (!isLoaded || devModeLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#116530" />
      </View>
    );
  }

  if (!isDevMode && !isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  // Só decide o redirect de onboarding quando o status já resolveu, pra não
  // piscar a tela de onboarding antes do getProfile responder.
  if (onboardingReady && needsOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  if (!onboardingReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#116530" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: true }} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
```

> Nota: o `onboarding.tsx` fica em `app/` (fora do grupo `(app)`), então este guard não cria loop — o redirect sai para uma rota irmã, não filha deste layout.

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
cd apps/mobile && pnpm test -- "_layout"
```

Expected: PASS (ambos os casos).

- [ ] **Step 5: Redirect pós-login em sign-in e sign-up**

Em `apps/mobile/app/(auth)/sign-in.tsx`, na função `activateClerkSession`, trocar o destino fixo por uma checagem de perfil. Substituir:

```ts
  async function activateClerkSession(sessionId: string | null | undefined) {
    if (!sessionId) throw new Error("Sessão não foi criada. Tente novamente.");
    await activateSession({ session: sessionId });
    router.replace("/");
  }
```

por:

```ts
  async function activateClerkSession(sessionId: string | null | undefined) {
    if (!sessionId) throw new Error("Sessão não foi criada. Tente novamente.");
    await activateSession({ session: sessionId });
    // O guard de (app)/_layout.tsx é a autoridade final sobre onboarding;
    // mandar sempre pra "/" deixa ele decidir se redireciona pra /onboarding.
    router.replace("/");
  }
```

> Efeito: nenhuma mudança de código estritamente necessária em `activateClerkSession` além do comentário — **o guard da Task 10 já cobre o redirect**. Portanto, para sign-in/sign-up, a única ação é confirmar (lendo os arquivos) que ambos navegam para `/` após ativar a sessão, e **não** para uma rota interna que burle o grupo `(app)`. Se algum deles navegar direto pra uma rota sob `(app)` sem passar pelo layout, ajustar para `router.replace("/")`. Não reescrever o fluxo OTP.

- [ ] **Step 6: Rodar a suíte de auth (garantir zero regressão nos testes OTP existentes) e typecheck**

```bash
cd apps/mobile && pnpm test -- "(auth)" && pnpm typecheck
```

Expected: testes de sign-in/sign-up existentes continuam passando; typecheck sem erro novo.

> Se os testes de auth já estavam quebrados na `main` (placeholder divergente — ver AUDITORIA.md item 2, CI não roda mobile), **não** corrigir aqui: anotar e tratar num commit separado com a skill `root-cause-fix`. Migração/feature e correção nunca no mesmo commit.

- [ ] **Step 7: Commit**

```bash
cd ../..
git add "apps/mobile/app/(app)/_layout.tsx" "apps/mobile/app/(app)/__tests__/_layout.test.tsx" \
  "apps/mobile/app/(auth)/sign-in.tsx" "apps/mobile/app/(auth)/sign-up.tsx"
git commit -m "feat(mobile): gate logged-in routes behind onboarding completion"
```

---

### Task 11: Extensão do provider-setup (município, bio, anos, portfólio)

Estende a tela existente com os campos sociais e o upload de fotos, e troca o município hardcoded pelo real. É a task mais pesada (adiciona `expo-image-picker` + upload pro Storage).

**Files:**
- Modify: `apps/mobile/app/(app)/profile/provider-setup.tsx`
- Modify: `apps/mobile/package.json`, `pnpm-lock.yaml` (nova dep `expo-image-picker`)
- Create: `apps/mobile/lib/upload-portfolio.ts` (helper de upload isolado)
- Test: `apps/mobile/lib/__tests__/upload-portfolio.test.ts`

**Interfaces:**
- Consumes: `identity.updateProviderProfile` (existente, categorias+localização), `identity.updateProviderSocialProfile` (Task 5), `identity.getProfile` (Task 5, para reidratar).
- Produces: tela salva bio + anos + portfólio; perfil incompleto pode salvar parcialmente (não bloqueia a conta), mas só aparece na busca quando `bio` + ≥1 foto existem (gate da Task 2).

- [ ] **Step 1: Instalar expo-image-picker**

```bash
cd apps/mobile && npx expo install expo-image-picker && cd ../..
```

- [ ] **Step 2: Escrever o teste do helper de upload (que falha)**

Criar `apps/mobile/lib/__tests__/upload-portfolio.test.ts`:

```ts
const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();

jest.mock("../supabase-client", () => ({
  getSupabaseStorage: () => ({
    from: () => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }),
  }),
}));

import { buildPortfolioPath } from "../upload-portfolio";

describe("buildPortfolioPath", () => {
  it("scopes the object under the user id prefix", () => {
    const path = buildPortfolioPath("user_test_123", "photo.jpg");
    expect(path.startsWith("user_test_123/")).toBe(true);
    expect(path).toContain("photo.jpg");
  });
});
```

> Nota: o teste cobre só `buildPortfolioPath` (lógica pura de ownership do path, que é a parte com regra de segurança). O upload em si (rede/Storage) fica fora do teste unitário — é verificado manualmente no Step 7.

- [ ] **Step 3: Rodar e confirmar que falha**

```bash
cd apps/mobile && pnpm test -- upload-portfolio
```

Expected: FAIL — `../upload-portfolio` não existe.

- [ ] **Step 4: Implementar o helper de upload**

Criar `apps/mobile/lib/upload-portfolio.ts`:

```ts
import { getSupabaseStorage } from "./supabase-client";

const BUCKET = "portfolio";

/** Path sob o prefixo do próprio usuário — casa com a policy portfolio_insert_own. */
export function buildPortfolioPath(userId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${Date.now()}_${safeName}`;
}

/**
 * Faz upload de uma imagem local e devolve o path salvo (não a URL assinada).
 * `fileUri` vem do expo-image-picker; `userId` é o clerk_user_id do dono.
 */
export async function uploadPortfolioImage(
  userId: string,
  fileUri: string,
  fileName: string
): Promise<string> {
  const path = buildPortfolioPath(userId, fileName);
  const response = await fetch(fileUri);
  const blob = await response.blob();

  const storage = getSupabaseStorage();
  const { error } = await storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: false,
  });
  if (error) {
    throw new Error(`Falha ao enviar foto: ${error.message}`);
  }
  return path;
}
```

> Nota: `getSupabaseStorage` deve existir em `apps/mobile/lib/supabase-client.ts`. Se não existir um cliente Supabase no mobile (o commit `8d61eda` removeu um cliente Supabase morto), criar um mínimo que instancie `createClient` com `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` e injete o JWT do Clerk via `global.headers`/`accessToken`. Isolar isso num Step próprio se o arquivo não existir — verificar antes com `ls apps/mobile/lib/`.

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
cd apps/mobile && pnpm test -- upload-portfolio
```

Expected: PASS.

- [ ] **Step 6: Estender a tela `provider-setup.tsx`**

Modificar `apps/mobile/app/(app)/profile/provider-setup.tsx`:

1. Adicionar imports: `import * as ImagePicker from "expo-image-picker";`, `import { uploadPortfolioImage } from "../../../lib/upload-portfolio";`, `import { Image } from "react-native";`.
2. Adicionar estado:

```ts
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
```

3. No `loadProfile` existente, reidratar os novos campos a partir do `identity.getProfile` (que já retorna `bio`, `yearsExperience`, `portfolioUrls`, `municipality` após a Task 5):

```ts
        const profile = await callRpc<{
          serviceCategories?: ServiceCategory[];
          bio?: string | null;
          yearsExperience?: number | null;
          portfolioUrls?: string[];
        }>("identity.getProfile");
        if (mounted && profile) {
          if (profile.serviceCategories) setSelectedCategories(profile.serviceCategories);
          if (profile.bio) setBio(profile.bio);
          if (profile.yearsExperience != null) setYearsExperience(String(profile.yearsExperience));
          if (profile.portfolioUrls) setPortfolioUrls(profile.portfolioUrls);
        }
```

4. Adicionar handler de escolha de foto:

```ts
  const pickPhoto = async () => {
    if (portfolioUrls.length >= 6) {
      showToast("Máximo de 6 fotos.", "error");
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast("Precisamos de acesso às fotos para o portfólio.", "error");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const path = await uploadPortfolioImage(
        effectiveUserId,
        asset.uri,
        asset.fileName ?? "foto.jpg"
      );
      setPortfolioUrls((prev) => [...prev, path]);
    } catch (error: any) {
      // Rede rural intermitente: não trava o formulário; o gate de
      // visibilidade cobre portfólio vazio (ver spec §Erros).
      showToast(error.message ?? "Não foi possível enviar a foto.", "error");
    } finally {
      setUploading(false);
    }
  };
```

> `effectiveUserId` vem de `useEffectiveUserId()` — trocar `const { isReady: isAuthReady } = useEffectiveUserId();` por `const { userId: effectiveUserId, isReady: isAuthReady } = useEffectiveUserId();`.

5. No `handleSave`, após `identity.updateProviderProfile` (categorias+localização), adicionar a persistência do perfil social — validando client-side espelhando o Zod, mas permitindo salvar parcial (bio/foto incompletos apenas não completam o perfil, ver spec):

```ts
      // Perfil social só é enviado quando completo; parcial fica pro usuário
      // terminar depois (a conta já existe; o gate é de visibilidade na busca).
      const trimmedBio = bio.trim();
      const years = Number(yearsExperience);
      if (trimmedBio.length >= 40 && portfolioUrls.length >= 1 && Number.isFinite(years)) {
        await callRpc("identity.updateProviderSocialProfile", {
          bio: trimmedBio,
          yearsExperience: Math.max(0, Math.min(60, Math.trunc(years))),
          portfolioUrls,
        });
      }
```

6. Trocar o texto hardcoded do município. Substituir o bloco:

```tsx
        <View style={styles.locationBox}>
          <Text style={styles.locationText}>Concórdia, SC (Detectado)</Text>
        </View>
```

por um campo editável ligado ao município real (reidratado do perfil / preenchido no onboarding). Adicionar estado `const [municipality, setMunicipality] = useState("");`, reidratar de `profile.municipality` no `loadProfile`, e renderizar um `TextInput`/`Input` com placeholder `"Sua cidade"`. (Município é salvo por `identity.updateProfile`; se o usuário editar aqui, chamar `identity.updateProfile` com `displayName` atual + novo `municipality` — buscar `displayName` no `loadProfile` para não sobrescrever com vazio.)

7. Adicionar as seções visuais de bio, anos e portfólio (campos `TextInput` multiline para bio, numérico para anos, grade de thumbnails com `Image` + botão "Adicionar foto" chamando `pickPhoto`).

- [ ] **Step 7: Verificação manual do fluxo completo (evidência)**

```bash
cd apps/mobile && pnpm web
```

Percorrer: onboarding → "Quero oferecer serviços" → provider-setup → preencher categorias, cidade, bio (≥40 chars), anos, adicionar 1 foto → salvar. Confirmar no Supabase (tabela `profiles` + bucket `portfolio`) que os dados persistiram e o path da foto está sob `{userId}/`. Depois, buscar o próprio prestador via discovery e confirmar que agora aparece (antes de completar bio/foto, não aparecia — gate da Task 2). Colar evidência (screenshots + linha da tabela).

- [ ] **Step 8: Typecheck, testes e commit**

```bash
cd apps/mobile && pnpm test && pnpm typecheck
cd ../..
git add "apps/mobile/app/(app)/profile/provider-setup.tsx" apps/mobile/lib/upload-portfolio.ts \
  apps/mobile/lib/__tests__/upload-portfolio.test.ts apps/mobile/package.json pnpm-lock.yaml
git add apps/mobile/lib/supabase-client.ts 2>/dev/null || true
git commit -m "feat(mobile): collect provider social profile (bio, experience, portfolio)"
```

---

### Task 12: Verificação final de regressão e revisão de segurança

**Files:** nenhum arquivo novo — verificação de fechamento.

- [ ] **Step 1: Suíte completa da API (mesmo comando do CI)**

```bash
pnpm --filter @amauc/api test
```

Expected: toda a suíte verde.

- [ ] **Step 2: Suíte e typecheck do mobile**

```bash
cd apps/mobile && pnpm test && pnpm typecheck && cd ../..
```

Expected: verde. (Lembrar: CI não roda mobile — esta é a rede de segurança.)

- [ ] **Step 3: Checklist de segurança (§7 do CLAUDE.md)**

Confirmar, com evidência:
- `identity.updateProfile` / `updateProviderSocialProfile` filtram por `clerk_user_id` do JWT (auto-referenciado, sem vazar pra outro usuário).
- Policy `portfolio_insert_own` impede escrever sob prefixo de outro usuário (testar tentando upload com path `outro_user/x.jpg` → deve falhar).
- `search_providers` continua `SECURITY DEFINER` e o novo filtro não expõe prestador incompleto.
- Nenhum secret novo em `EXPO_PUBLIC_*` além de URL/anon key (que são públicos por design).
- `DEV_BYPASS_TOKEN` continua atrás de `__DEV__` (nada neste plano mexeu nisso).

Rodar a skill `auth-security-guard` para a auditoria formal já que as mudanças tocam ownership, RLS e Storage.

- [ ] **Step 4: Abrir PR**

```bash
git push -u origin fix/cadastro-bifurcado
gh pr create --title "feat: cadastro bifurcado (contratante/prestador) + perfil social + base NativeWind" \
  --body "Implementa docs/superpowers/specs/2026-08-13-cadastro-bifurcado-design.md"
```

---

## Self-Review

**Spec coverage:**
- Estratégia de branch (cherry-pick, não merge bruto) → Task 1 + nota de origem em cada task portada. ✓
- Colunas sociais (display_name, avatar_url, municipality, bio, years_experience, portfolio_urls) → Task 2. ✓
- Bucket Storage `portfolio` + policies de ownership → Task 3. ✓
- Filtro de visibilidade em `search_providers` (bio + portfólio) → Task 2. ✓
- Contratos `updateIdentityProfileSchema` / `updateProviderSocialProfileSchema` → Task 4. ✓
- `identity.getProfile` estendido + `updateProfile` + `updateProviderSocialProfile` → Task 5. ✓
- Tokens NativeWind + componentes RNR → Tasks 6, 7. ✓
- Fluxo: getProfile pós-login → onboarding se sem nome → Tasks 8, 10. ✓
- Onboarding dois passos (nome+município → papel), bifurcação contratante/prestador → Task 9. ✓
- Guard `(app)/_layout.tsx` cobrindo deep link → Task 10. ✓
- provider-setup estendido (bio/anos/portfólio) + município real substituindo hardcoded → Task 11. ✓
- Edge cases (getProfile falha → onboarding; bio < 40; upload falha não trava) → Tasks 8, 9, 11. ✓
- Testes: handlers API, schemas shared, onboarding, guard, upload path → Tasks 4, 5, 8, 9, 10, 11. ✓
- "Próximos passos" (chat, PostGIS, reforma do resto do app) permanecem fora → registrados no backlog 999.1-999.3, nenhuma task aqui. ✓

**Gap consciente:** o teste de integração real de `search_providers` (spec §Testes) não é coberto por teste JS — o mock de Supabase da suíte da API não exercita SQL. Substituído por verificação manual via `supabase db push` + query psql (Task 2 Step 3) e pelo fluxo E2E manual (Task 11 Step 7), que é a evidência honesta possível sem um Supabase de teste com PostGIS provisionado no CI. Registrado como limitação, não como placeholder.

**Type consistency:** `callRpc` (assinatura `<T>(procedure, input?)`), `useOnboardingStatus(): { needsOnboarding, isReady }`, `ProfileRow` com campos snake_case, payloads RPC camelCase (`displayName`, `yearsExperience`, `portfolioUrls`) — consistentes entre Tasks 4, 5, 8, 9, 11. `buildPortfolioPath(userId, fileName)` / `uploadPortfolioImage(userId, fileUri, fileName)` idênticos entre Task 11 Steps 2 e 4. ✓

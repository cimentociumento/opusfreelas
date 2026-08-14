# Identidade & Onboarding de Papel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Depois do login OTP, coletar nome do usuário e oferecer (sem forçar) o papel de prestador, antes de liberar a home — resolvendo a ausência total de identidade pessoal no modelo de dados atual.

**Architecture:** Duas colunas novas em `profiles` (`display_name`, `avatar_url`). Um novo RPC (`identity.updateProfile`) e um campo a mais nos RPCs existentes (`identity.getProfile`, `discovery.searchProviders`). No mobile, um hook compartilhado (`useOnboardingStatus`) decide se o usuário precisa passar pela tela `app/onboarding.tsx`; o guard entra em dois pontos: logo após ativar a sessão Clerk (`sign-in.tsx`) e no layout da área logada (`(app)/_layout.tsx`, cobre deep link).

**Tech Stack:** Hono (API), Zod (`@amauc/shared`), Supabase/Postgres, Expo Router, React Native, Clerk, Vitest, Jest (jest-expo), `@testing-library/react-native`.

## Global Constraints

- Mantém D-06 (`.planning/phases/01-foundation-identity/01-CONTEXT.md`): conta única, dois papéis, sem forçar escolha exclusiva.
- TypeScript strict, sem `any`/`@ts-ignore` (`CLAUDE.md`).
- Todo handler RPC valida input via `safeParse` e retorna 400 com `error.flatten()` antes de qualquer query (`.claude/rules/api-handlers.md`).
- Migrations são append-only; nunca editar uma já aplicada (`.claude/rules/migrations.md`).
- Estilo em telas mobile vem só de `components/theme.ts` — sem valor hardcoded (`.claude/rules/mobile-crossplatform.md`).
- `catch {}` vazio proibido; logar com contexto `[modulo.funcao]` ou propagar (`CLAUDE.md`).
- Teste da API roda com `pnpm --filter @amauc/api vitest run`; do mobile com `pnpm --filter @amauc/mobile test`; typecheck do mobile com `pnpm --filter @amauc/mobile typecheck`.

---

### Task 1: Contrato compartilhado — `updateIdentityProfileSchema`

**Files:**
- Modify: `packages/shared/src/identity/schemas.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces: `updateIdentityProfileSchema: ZodSchema`, `type UpdateIdentityProfileInput = { displayName: string }` — consumido pelas Tasks 4 e 8.

- [ ] **Step 1: Adicionar o schema**

Em `packages/shared/src/identity/schemas.ts`, acrescentar ao final do arquivo:

```ts
export const updateIdentityProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
});
export type UpdateIdentityProfileInput = z.infer<typeof updateIdentityProfileSchema>;
```

- [ ] **Step 2: Exportar no barrel**

Em `packages/shared/src/index.ts`, o bloco de export nomeado de `./identity/schemas` passa a incluir os dois novos símbolos:

```ts
export {
  profileRoleFlagsSchema,
  type ProfileRoleFlagsInput,
  updateIdentityProfileSchema,
  type UpdateIdentityProfileInput,
} from "./identity/schemas";
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @amauc/mobile typecheck`
Expected: sem erros (nada consome o símbolo ainda, só confirma que o pacote compila)

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/identity/schemas.ts packages/shared/src/index.ts
git commit -m "feat(shared): add updateIdentityProfileSchema contract"
```

---

### Task 2: Migration — `display_name`, `avatar_url` e `search_providers`

**Files:**
- Create: `supabase/migrations/20260807000000_profile_identity.sql`

**Interfaces:**
- Produces: colunas `profiles.display_name text`, `profiles.avatar_url text`; function `public.search_providers(...)` retornando `display_name` a mais — consumido pelas Tasks 3 e 6.

- [ ] **Step 1: Escrever a migration**

```sql
-- Adiciona identidade pessoal minima ao perfil (nome exibido, avatar opcional).
-- Sem NOT NULL: display_name nulo e o sinal de "onboarding pendente" lido
-- pelo app (ver identity.getProfile e o guard em (app)/_layout.tsx no mobile).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Postgres nao permite CREATE OR REPLACE mudar o RETURNS TABLE de uma
-- function existente; precisa dropar antes de recriar com a coluna nova.
DROP FUNCTION IF EXISTS public.search_providers(float8, float8, text, integer);

CREATE OR REPLACE FUNCTION public.search_providers(
  user_lat float8,
  user_lng float8,
  search_category text DEFAULT NULL,
  radius_km integer DEFAULT 50
)
RETURNS TABLE (
  clerk_user_id text,
  is_provider boolean,
  display_name text,
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
    p.display_name,
    p.service_categories,
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
```

- [ ] **Step 2: Aplicar localmente e validar**

Run: `cd supabase && supabase db reset` (ou o fluxo local já usado no projeto para aplicar migrations pendentes)
Expected: migration roda sem erro; `\d profiles` mostra `display_name` e `avatar_url`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260807000000_profile_identity.sql
git commit -m "feat(db): add display_name/avatar_url to profiles, propagate to search_providers"
```

---

### Task 3: `ProfileRow` e `getProfileByClerkUserId`

**Files:**
- Modify: `apps/api/src/lib/profile.ts:6-33`

**Interfaces:**
- Consumes: nenhuma nova (colunas da Task 2 já existem no banco de teste/dev quando este teste rodar).
- Produces: `ProfileRow` com `display_name: string | null`, `avatar_url: string | null` — consumido pelas Tasks 4 e 5.

- [ ] **Step 1: Atualizar o tipo e o select**

Substituir o bloco (`apps/api/src/lib/profile.ts:6-33`):

```ts
export type ProfileRow = {
  clerk_user_id: string;
  is_contractor: boolean;
  is_provider: boolean;
  display_name?: string | null;
  avatar_url?: string | null;
  service_categories?: string[];
};

export async function getProfileByClerkUserId(userId: string): Promise<ProfileRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("clerk_user_id, is_contractor, is_provider, display_name, avatar_url, service_categories")
    .eq("clerk_user_id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  return (
    data ?? {
      clerk_user_id: userId,
      is_contractor: true,
      is_provider: false,
      display_name: null,
      avatar_url: null,
      service_categories: [],
    }
  );
}
```

- [ ] **Step 2: Typecheck (não há teste dedicado a este arquivo — coberto pela Task 4)**

Run: `pnpm --filter @amauc/api vitest run`
Expected: PASS (suite existente continua passando; nenhum teste ainda depende dos campos novos)

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/profile.ts
git commit -m "feat(api): return display_name/avatar_url from getProfileByClerkUserId"
```

---

### Task 4: `identity.getProfile` retorna `displayName`/`avatarUrl`

**Files:**
- Modify: `apps/api/src/rpc/identity.ts:19-28`
- Test: `apps/api/src/rpc/rpc-features.test.ts`

**Interfaces:**
- Consumes: `ProfileRow` da Task 3 (`display_name`, `avatar_url`).
- Produces: payload JSON de `identity.getProfile` com `displayName: string | null`, `avatarUrl: string | null` — consumido pelas Tasks 9 e 10 (mobile).

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `apps/api/src/rpc/rpc-features.test.ts`, dentro de um novo `describe("Identity RPC", ...)` logo antes do `describe("Discovery RPC", ...)` existente (linha 422):

```ts
  describe("Identity RPC", () => {
    it("getProfile returns displayName and avatarUrl", async () => {
      const mockProfile = {
        clerk_user_id: authState.userId,
        is_contractor: true,
        is_provider: false,
        display_name: "Maria Souza",
        avatar_url: null,
        service_categories: [],
      };

      fromMock.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      }));

      const res = await app.request("/rpc", {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ procedure: "identity.getProfile", input: {} }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.displayName).toBe("Maria Souza");
      expect(data.avatarUrl).toBeNull();
    });
  });

```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `pnpm --filter @amauc/api vitest run -t "getProfile returns displayName"`
Expected: FAIL — `data.displayName` é `undefined`, não `"Maria Souza"`

- [ ] **Step 3: Implementar**

Substituir `apps/api/src/rpc/identity.ts:19-28`:

```ts
  "identity.getProfile": async (c: Context) => {
    const auth = getAuthUser(c);
    const profile = await getProfileByClerkUserId(auth.userId);
    return c.json({
      clerkUserId: profile.clerk_user_id,
      isContractor: profile.is_contractor,
      isProvider: profile.is_provider,
      displayName: profile.display_name ?? null,
      avatarUrl: profile.avatar_url ?? null,
      serviceCategories: profile.service_categories ?? [],
    });
  },
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `pnpm --filter @amauc/api vitest run`
Expected: PASS (toda a suite, sem regressão nos testes existentes de `identity`/`demands`/`discovery`)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/rpc/identity.ts apps/api/src/rpc/rpc-features.test.ts
git commit -m "feat(api): identity.getProfile returns displayName and avatarUrl"
```

---

### Task 5: novo handler `identity.updateProfile`

**Files:**
- Modify: `apps/api/src/rpc/identity.ts`
- Test: `apps/api/src/rpc/rpc-features.test.ts`

**Interfaces:**
- Consumes: `updateIdentityProfileSchema` (Task 1).
- Produces: procedure `identity.updateProfile`, input `{ displayName: string }`, output `{ clerkUserId: string, displayName: string }` — consumido pela Task 8 (mobile, tela de onboarding).

- [ ] **Step 1: Escrever o teste que falha**

Adicionar dentro do `describe("Identity RPC", ...)` criado na Task 4, depois do teste de `getProfile`:

```ts
    it("updateProfile saves displayName", async () => {
      const updatedRow = {
        clerk_user_id: authState.userId,
        display_name: "João Pedro",
      };

      fromMock.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
            }),
          }),
        }),
      }));

      const res = await app.request("/rpc", {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          procedure: "identity.updateProfile",
          input: { displayName: "João Pedro" },
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.displayName).toBe("João Pedro");
    });

    it("updateProfile rejects a name shorter than 2 characters", async () => {
      const res = await app.request("/rpc", {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          procedure: "identity.updateProfile",
          input: { displayName: "A" },
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid input");
    });
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `pnpm --filter @amauc/api vitest run -t "updateProfile"`
Expected: FAIL — procedure `identity.updateProfile` não existe (erro de "unknown procedure" ou 404, conforme o router trata procedure desconhecida)

- [ ] **Step 3: Implementar**

Em `apps/api/src/rpc/identity.ts`, atualizar o import no topo do arquivo:

```ts
import {
  profileRoleFlagsSchema,
  updateProviderProfileSchema,
  updateIdentityProfileSchema,
} from "@amauc/shared";
```

E acrescentar o handler dentro do objeto `identityHandlers`, logo após `identity.getProfile` (antes de `identity.updateRoles`):

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
      .update({ display_name: parsed.data.displayName, updated_at: new Date().toISOString() })
      .eq("clerk_user_id", auth.userId)
      .select("clerk_user_id, display_name")
      .single();

    if (error) {
      return c.json({ error: "Database error", details: error.message }, 500);
    }

    return c.json({
      clerkUserId: data.clerk_user_id,
      displayName: data.display_name,
    });
  },
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `pnpm --filter @amauc/api vitest run`
Expected: PASS, suite inteira

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/rpc/identity.ts apps/api/src/rpc/rpc-features.test.ts
git commit -m "feat(api): add identity.updateProfile RPC handler"
```

---

### Task 6: `discovery.searchProviders` inclui `displayName`

**Files:**
- Modify: `apps/api/src/rpc/discovery.ts`
- Test: `apps/api/src/rpc/rpc-features.test.ts:422-458`

**Interfaces:**
- Consumes: `search_providers` da Task 2 (coluna `display_name` na função SQL).
- Produces: `ProviderResult.displayName: string | null` no payload de `discovery.searchProviders`.

- [ ] **Step 1: Atualizar o teste existente pra exigir o campo**

Em `apps/api/src/rpc/rpc-features.test.ts`, dentro de `describe("Discovery RPC", ...)`, atualizar o mock e a asserção do teste `"searches providers successfully"` (linhas ~424-457):

```ts
    it("searches providers successfully", async () => {
      const mockProviders = [
        {
          clerk_user_id: "provider_1",
          is_provider: true,
          display_name: "Carlos Ferreira",
          service_categories: ["Roçada / Capina"],
          distance_meters: 1500
        }
      ];

      rpcMock.mockResolvedValue({ data: mockProviders, error: null });

      const res = await app.request("/rpc", {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          procedure: "discovery.searchProviders",
          input: {
            latitude: -27.23,
            longitude: -52.03,
            category: "Roçada / Capina",
            radius: 50
          },
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0].clerkUserId).toBe("provider_1");
      expect(data[0].displayName).toBe("Carlos Ferreira");
      expect(data[0].distanceMeters).toBe(1500);
    });
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `pnpm --filter @amauc/api vitest run -t "searches providers successfully"`
Expected: FAIL — `data[0].displayName` é `undefined`

- [ ] **Step 3: Implementar**

Substituir `apps/api/src/rpc/discovery.ts` inteiro (arquivo pequeno, a mudança toca o type e o map):

```ts
import { z } from "zod";  
import type { Context } from "hono";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { providerSearchSchema } from "@amauc/shared";

type ProviderResult = {
  clerkUserId: string;
  isProvider: boolean;
  displayName: string | null;
  serviceCategories: string[];
  distanceMeters: number;
};

export const discoveryHandlers = {
  "discovery.searchProviders": async (c: Context, input: unknown) => {
    const parsed = providerSearchSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const { latitude, longitude, category, radius } = parsed.data;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.rpc("search_providers", {
      user_lat: latitude,
      user_lng: longitude,
      search_category: category || null,
      radius_km: radius
    });

    if (error) {
      console.error("[discovery.searchProviders] Database error:", error);
      return c.json({ error: "Database error", details: error.message }, 500);
    }

    const results: ProviderResult[] = (data || []).map((row: any) => ({
      clerkUserId: row.clerk_user_id,
      isProvider: row.is_provider,
      displayName: row.display_name ?? null,
      serviceCategories: row.service_categories,
      distanceMeters: row.distance_meters
    }));

    return c.json(results);
  }
};
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `pnpm --filter @amauc/api vitest run`
Expected: PASS, suite inteira

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/rpc/discovery.ts apps/api/src/rpc/rpc-features.test.ts
git commit -m "feat(api): discovery.searchProviders returns displayName"
```

---

### Task 7: hook `useOnboardingStatus` (mobile)

**Files:**
- Create: `apps/mobile/hooks/use-onboarding-status.ts`
- Test: `apps/mobile/hooks/__tests__/use-onboarding-status.test.ts`

**Interfaces:**
- Consumes: `useEffectiveUserId()` (`apps/mobile/hooks/use-effective-user-id.ts`), `useRpcWithDevMode()` (`apps/mobile/hooks/use-rpc-with-dev-mode.ts`).
- Produces: `useOnboardingStatus(): { needsOnboarding: boolean | null; isReady: boolean }` — consumido pelas Tasks 9 e 10.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/mobile/hooks/__tests__/use-onboarding-status.test.ts`:

```ts
import { renderHook, waitFor } from "@testing-library/react-native";
import { useOnboardingStatus } from "../use-onboarding-status";

const mockCallRpc = jest.fn();

jest.mock("../use-effective-user-id", () => ({
  useEffectiveUserId: () => ({ userId: "user_test_123", isReady: true }),
}));
jest.mock("../use-rpc-with-dev-mode", () => ({
  useRpcWithDevMode: () => ({ callRpc: mockCallRpc }),
}));

describe("useOnboardingStatus", () => {
  beforeEach(() => {
    mockCallRpc.mockReset();
  });

  it("needsOnboarding is true when profile has no displayName", async () => {
    mockCallRpc.mockResolvedValue({ displayName: null });

    const { result } = renderHook(() => useOnboardingStatus());

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.needsOnboarding).toBe(true);
  });

  it("needsOnboarding is false when profile already has displayName", async () => {
    mockCallRpc.mockResolvedValue({ displayName: "Maria Souza" });

    const { result } = renderHook(() => useOnboardingStatus());

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.needsOnboarding).toBe(false);
  });

  it("treats a failed profile fetch as needing onboarding", async () => {
    mockCallRpc.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useOnboardingStatus());

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.needsOnboarding).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `pnpm --filter @amauc/mobile test use-onboarding-status`
Expected: FAIL — `Cannot find module '../use-onboarding-status'`

- [ ] **Step 3: Implementar**

Criar `apps/mobile/hooks/use-onboarding-status.ts`:

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

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `pnpm --filter @amauc/mobile test use-onboarding-status`
Expected: PASS, 3 testes

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/hooks/use-onboarding-status.ts apps/mobile/hooks/__tests__/use-onboarding-status.test.ts
git commit -m "feat(mobile): add useOnboardingStatus hook"
```

---

### Task 8: tela `app/onboarding.tsx`

**Files:**
- Create: `apps/mobile/app/onboarding.tsx`
- Test: `apps/mobile/app/__tests__/onboarding.test.tsx`

**Interfaces:**
- Consumes: `useOnboardingStatus()` (Task 7), `useRpcWithDevMode().callRpc` (procedure `identity.updateProfile` da Task 5), `Button`/`theme`/`useToast` de `apps/mobile/components`.
- Produces: rota `/onboarding`, sem export de função reutilizável (tela terminal).

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

import OnboardingScreen from "../onboarding";

describe("OnboardingScreen", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockCallRpc.mockReset();
  });

  it("saves the name and navigates home when the user skips the provider step", async () => {
    mockCallRpc.mockResolvedValue({ clerkUserId: "user_test_123", displayName: "Maria Souza" });

    const { getByPlaceholderText, getByText } = render(<OnboardingScreen />);

    fireEvent.changeText(getByPlaceholderText("Seu nome"), "Maria Souza");
    fireEvent.press(getByText("Continuar"));

    await waitFor(() =>
      expect(mockCallRpc).toHaveBeenCalledWith("identity.updateProfile", { displayName: "Maria Souza" }),
    );

    fireEvent.press(await waitFor(() => getByText("Agora não")));

    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("navigates to provider setup when the user opts in", async () => {
    mockCallRpc.mockResolvedValue({ clerkUserId: "user_test_123", displayName: "João Pedro" });

    const { getByPlaceholderText, getByText } = render(<OnboardingScreen />);

    fireEvent.changeText(getByPlaceholderText("Seu nome"), "João Pedro");
    fireEvent.press(getByText("Continuar"));

    fireEvent.press(await waitFor(() => getByText("Sim, quero oferecer serviços")));

    expect(mockReplace).toHaveBeenCalledWith("/profile/provider-setup");
  });

  it("blocks submit when the name is empty", () => {
    const { getByText } = render(<OnboardingScreen />);

    fireEvent.press(getByText("Continuar"));

    expect(mockCallRpc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `pnpm --filter @amauc/mobile test app/__tests__/onboarding`
Expected: FAIL — `Cannot find module '../onboarding'`

- [ ] **Step 3: Implementar**

Criar `apps/mobile/app/onboarding.tsx`:

```tsx
import { useState } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { Redirect, useRouter } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useOnboardingStatus } from "../hooks/use-onboarding-status";
import { useRpcWithDevMode } from "../hooks/use-rpc-with-dev-mode";
import { Button, theme, useToast } from "../components";

type Step = "name" | "role";

export default function OnboardingScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { needsOnboarding, isReady } = useOnboardingStatus();
  const { callRpc } = useRpcWithDevMode();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;
  if (isReady && !needsOnboarding) return <Redirect href="/" />;

  async function handleContinue() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      showToast("Digite seu nome (mínimo 2 letras).", "error");
      return;
    }

    setSaving(true);
    try {
      await callRpc("identity.updateProfile", { displayName: trimmed });
      setStep("role");
    } catch (error: any) {
      showToast(error.message ?? "Não foi possível salvar seu nome.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (step === "role") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Quer também oferecer serviços?</Text>
        <Text style={styles.subtitle}>
          Você pode ativar isso a qualquer momento no seu perfil.
        </Text>
        <Button
          title="Sim, quero oferecer serviços"
          variant="primary"
          size="lg"
          onPress={() => router.replace("/profile/provider-setup")}
        />
        <Button
          title="Agora não"
          variant="ghost"
          size="md"
          onPress={() => router.replace("/")}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Como você quer ser chamado?</Text>
      <Text style={styles.subtitle}>
        Esse nome aparece pra quem você contratar ou pra quem contratar você.
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Seu nome"
        autoCapitalize="words"
        style={styles.input}
      />
      <Button title="Continuar" variant="primary" size="lg" loading={saving} onPress={handleContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
  },
});
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `pnpm --filter @amauc/mobile test app/__tests__/onboarding`
Expected: PASS, 3 testes

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/onboarding.tsx apps/mobile/app/__tests__/onboarding.test.tsx
git commit -m "feat(mobile): add onboarding screen for name + optional provider setup"
```

---

### Task 9: `sign-in.tsx` decide destino pós-login

**Files:**
- Modify: `apps/mobile/app/(auth)/sign-in.tsx:84-119`
- Test: `apps/mobile/app/(auth)/__tests__/sign-in.test.tsx`

**Interfaces:**
- Consumes: `useRpcWithDevMode().callRpc` (procedure `identity.getProfile`, já retorna `displayName` pela Task 4).

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `apps/mobile/app/(auth)/__tests__/sign-in.test.tsx`, depois do mock de `@clerk/clerk-expo` (linha 46) e antes do `describe`, o mock do hook de RPC:

```ts
const mockCallRpc = jest.fn();
jest.mock("../../../hooks/use-rpc-with-dev-mode", () => ({
  useRpcWithDevMode: () => ({ callRpc: mockCallRpc }),
}));
```

E adicionar, dentro do `describe("SignInScreen sendCode", ...)` já existente, um novo `describe` logo depois (o `beforeEach` já limpa `mockReplace`; acrescentar `mockCallRpc.mockReset()` nele também):

```ts
  describe("SignInScreen post-verification redirect", () => {
    it("redirects to /onboarding when the profile has no displayName", async () => {
      mockSignIn.status = "needs_first_factor";
      mockSignIn.firstFactorVerification = { status: "verified" } as any;
      mockSignIn.createdSessionId = "sess_123";
      mockSignIn.attemptFirstFactor = jest.fn(async () => {
        mockSignIn.status = "complete";
      });
      mockCallRpc.mockResolvedValue({ displayName: null });

      const { getByPlaceholderText, getByText, rerender } = render(<SignInScreen />);
      await fireEvent.changeText(getByPlaceholderText("+55 49 99999-9999"), "49999999999");
      mockSignIn.create.mockImplementation(async () => {
        mockSignIn.status = "needs_first_factor";
        mockSignIn.supportedFirstFactors = [{ strategy: "phone_code", phoneNumberId: "phone_1" }];
      });
      await fireEvent.press(getByText("Enviar codigo"));
      await waitFor(() => expect(getByText(/Codigo enviado/)).toBeTruthy());

      await fireEvent.changeText(getByPlaceholderText("Codigo OTP"), "123456");
      await fireEvent.press(getByText("Confirmar codigo"));

      await waitFor(() => expect(mockCallRpc).toHaveBeenCalledWith("identity.getProfile"));
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/onboarding"));
    });
  });
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `pnpm --filter @amauc/mobile test sign-in`
Expected: FAIL — `mockReplace` foi chamado com `"/"`, não `"/onboarding"` (comportamento atual sempre manda pra home)

- [ ] **Step 3: Implementar**

Em `apps/mobile/app/(auth)/sign-in.tsx`, adicionar o import (junto aos demais, topo do arquivo):

```ts
import { useRpcWithDevMode } from "../../hooks/use-rpc-with-dev-mode";
```

Adicionar a chamada do hook junto às outras (depois da linha 89, `const { signUp, isLoaded: signUpLoaded } = useSignUp();`):

```ts
  const { callRpc } = useRpcWithDevMode();
```

Substituir `activateClerkSession` (linhas 115-119):

```ts
  async function activateClerkSession(sessionId: string | null | undefined) {
    if (!sessionId) throw new Error("Sessao nao foi criada. Tente novamente.");
    await activateSession({ session: sessionId });

    try {
      const profile = await callRpc<{ displayName?: string | null }>("identity.getProfile");
      router.replace(profile.displayName ? "/" : "/onboarding");
    } catch (error) {
      console.error("[sign-in.activateClerkSession] Failed to check profile", error);
      router.replace("/onboarding");
    }
  }
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `pnpm --filter @amauc/mobile test sign-in`
Expected: PASS, toda a suite do arquivo (os testes de `sendCode` existentes continuam passando — não tocam `activateClerkSession`)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(auth\)/sign-in.tsx apps/mobile/app/\(auth\)/__tests__/sign-in.test.tsx
git commit -m "feat(mobile): redirect to onboarding after login when profile has no name"
```

---

### Task 10: guard em `(app)/_layout.tsx`

**Files:**
- Modify: `apps/mobile/app/(app)/_layout.tsx`
- Test: `apps/mobile/app/(app)/__tests__/_layout.test.tsx`

**Interfaces:**
- Consumes: `useOnboardingStatus()` (Task 7).

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/mobile/app/(app)/__tests__/_layout.test.tsx`. Os dois testes precisam
de retornos diferentes de `useOnboardingStatus`; como `jest.mock` no topo do
arquivo é fixo, cada teste usa `jest.resetModules()` + `jest.doMock()` e
reimporta o componente via `require` para pegar o mock daquela rodada:

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
  beforeEach(() => {
    jest.resetModules();
  });

  it("renders the stack when onboarding is complete", () => {
    jest.doMock("../../../hooks/use-onboarding-status", () => ({
      useOnboardingStatus: () => ({ needsOnboarding: false, isReady: true }),
    }));
    const AppGroupLayout = require("../_layout").default;

    const { getByText } = render(<AppGroupLayout />);
    expect(getByText("stack")).toBeTruthy();
  });

  it("redirects to /onboarding when the profile needs onboarding", () => {
    jest.doMock("../../../hooks/use-onboarding-status", () => ({
      useOnboardingStatus: () => ({ needsOnboarding: true, isReady: true }),
    }));
    const AppGroupLayout = require("../_layout").default;

    const { getByText } = render(<AppGroupLayout />);
    expect(getByText("redirect:/onboarding")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `pnpm --filter @amauc/mobile test app/\(app\)/__tests__/_layout`
Expected: FAIL — hoje o layout não importa `useOnboardingStatus`, então o segundo teste (`needsOnboarding: true`) renderiza `stack` em vez de `redirect:/onboarding`

- [ ] **Step 3: Implementar**

Substituir `apps/mobile/app/(app)/_layout.tsx` inteiro:

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

  if (isDevMode) {
    return <Stack screenOptions={{ headerShown: true }} />;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  if (!onboardingReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#116530" />
      </View>
    );
  }

  if (needsOnboarding) {
    return <Redirect href="/onboarding" />;
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

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `pnpm --filter @amauc/mobile test app/\(app\)/__tests__/_layout`
Expected: PASS, 2 testes

- [ ] **Step 5: Rodar a suite mobile inteira (regressão)**

Run: `pnpm --filter @amauc/mobile test`
Expected: PASS, nenhum teste existente quebrado

- [ ] **Step 6: Typecheck mobile completo**

Run: `pnpm --filter @amauc/mobile typecheck`
Expected: sem erros

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/app/\(app\)/_layout.tsx apps/mobile/app/\(app\)/__tests__/_layout.test.tsx
git commit -m "feat(mobile): block app routes with onboarding redirect until profile has a name"
```

---

### Task 11: verificação final ponta a ponta

**Files:** nenhum (só validação)

- [ ] **Step 1: Suite completa da API**

Run: `pnpm --filter @amauc/api vitest run`
Expected: PASS, 0 falhas

- [ ] **Step 2: Suite completa do mobile**

Run: `pnpm --filter @amauc/mobile test`
Expected: PASS, 0 falhas

- [ ] **Step 3: Typecheck do mobile**

Run: `pnpm --filter @amauc/mobile typecheck`
Expected: sem erros

- [ ] **Step 4: Validação manual no Web (Playwright ou browser)**

Rodar `cd apps/mobile && pnpm web`, logar com um telefone novo (sem `display_name`) e confirmar:
1. cai em `/onboarding` (não em `/`)
2. preencher nome + "Agora não" → cai em `/` com o perfil salvo
3. dar F5 em `/` → continua em `/`, não volta pro onboarding
4. tentar acessar `/demands/create` direto por URL com uma conta sem `display_name` → redireciona pra `/onboarding` (cobre o guard do `(app)/_layout.tsx`)

Não há automação para este passo — é a validação de UX ponta a ponta que os testes unitários não cobrem (fluxo real do Clerk + navegação).

---

## Self-Review

**Cobertura do spec:** modelo de dados (Task 2), contrato compartilhado (Task 1), `identity.getProfile`/`identity.updateProfile` (Tasks 4, 5), `search_providers`/`discovery.searchProviders` (Tasks 2, 6), fluxo pós-login (Task 9), guard de rota profunda (Task 10), tela de onboarding com nome + oferta de papel (Task 8), tratamento de erro como "onboarding pendente" (Tasks 7 e 9) — todas as seções do spec de 2026-08-07 têm uma task correspondente.

**Placeholders:** nenhum "TBD"/"implementar depois" — todo step tem código completo.

**Consistência de tipos:** `displayName: string | null` usado de forma consistente entre `identity.getProfile` (Task 4), `useOnboardingStatus` (Task 7) e `identity.updateProfile` (Task 5); `needsOnboarding: boolean | null` e `isReady: boolean` usados igual nas Tasks 8 e 10.

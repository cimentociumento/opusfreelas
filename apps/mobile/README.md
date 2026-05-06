# @amauc/mobile

App Expo (SDK 55) com expo-router, Clerk OTP e integração Supabase.

## Desenvolvimento

Na raiz do monorepo:

```bash
pnpm --filter @amauc/mobile start
```

Ou, a partir desta pasta:

```bash
npx expo start
```

## Variáveis de ambiente

Copie `apps/mobile/.env.example` para `.env` e preencha:

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Notas operacionais

- AUTH-01: login por OTP de telefone via Clerk (habilitar BR +55 no Dashboard).
- AUTH-02: sessão persistente com `tokenCache` (SecureStore) no ClerkProvider.
- D-04: política de sessão (meta ~24h) configurada no painel do Clerk.
- D-03: conta única pode atuar como contratante e/ou prestador.
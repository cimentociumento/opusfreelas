# Supabase + Clerk (third-party JWT)

## Objetivo

Conectar **Clerk** como provedor de identidade ao **Supabase**, de forma que `auth.jwt()->>'sub'` nas políticas RLS corresponda ao `sub` estável do usuário Clerk (mesmo valor usado na API Hono).

## Painel Supabase

1. **Authentication → Sign In / Providers** — use o assistente de integração **Clerk** (third-party JWT), conforme [Supabase + Clerk](https://supabase.com/docs/guides/auth/third-party/clerk).
2. Configure o **issuer** e as chaves conforme o wizard; garanta que o JWT enviado pelo app inclua `sub` reconhecido pelo Supabase.

## Painel Clerk

1. **SMS / Phone** — habilite OTP por telefone; na allowlist de países inclua **Brasil (+55)** para AUTH-01.
2. **E-mail de backup** — configure recuperação por e-mail (D-02).
3. Conclua o pareamento com Supabase usando a documentação oficial do Clerk para Supabase.

## Variáveis de ambiente

Veja `.env.example` na raiz do repositório: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, e chaves Clerk usadas nos planos 01-04 e 01-05.

## Migrações

Após `supabase link` (projeto remoto) ou `supabase start` (local):

```bash
supabase db push
```

Evidência do push (exit code 0) e verificação da tabela `public.profiles` devem constar em `01-03-SUMMARY.md`.

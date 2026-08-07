---
name: auth-security-guard
description: |
  Auditoria de segurança para auth e dados no Opus Freelas (Clerk + JWT +
  DEV_BYPASS_TOKEN + Supabase RLS + ownership de demandas). Use SEMPRE que a
  mudança tocar autenticação, autorização, RLS, validação de input, ownership,
  ou secrets. Gatilhos: auth, login, OTP, Clerk, token, JWT, RLS, permissão,
  ownership, contractor_id, segurança, secret, bypass, rate limit.
---

# Guardião de segurança — Opus Freelas

Auth é o ponto que mais causou regressão neste projeto. Toda mudança que o
toca exige justificativa explícita de segurança na resposta.

## Modelo de auth do projeto
- Clerk emite JWT via OTP por telefone. Middleware `requireClerkAuth`
  (`apps/api/src/middleware/clerk.ts`) valida o Bearer token.
- `DEV_BYPASS_TOKEN`: atalho de dev. O middleware DEVE rejeitá-lo quando
  `NODE_ENV=production`. Essa checagem é sagrada — nunca remover.
- Ownership: handlers de demanda comparam `contractor_id === userId`
  (`getOwnedDemand` em `rpc/demands.ts`). API é a primeira linha; RLS no
  Supabase é a última.

## Checklist obrigatório (rodar em toda mudança relevante)
- [ ] Endpoint protegido valida o JWT do Clerk?
- [ ] Ownership checado antes de update/delete (`contractor_id === userId`)?
- [ ] RLS no Supabase reforça a mesma regra? (não confiar só na API)
- [ ] `DEV_BYPASS_TOKEN` continua bloqueado em produção?
- [ ] Input validado por Zod (de `@amauc/shared`) antes de qualquer query?
- [ ] Nenhum secret exposto? Lembrar: `EXPO_PUBLIC_*` vai para o bundle e É
      PÚBLICO — nunca colocar secret ali. Nada de secret em código ou git.
- [ ] Rate limiting em OTP e publicação de demanda?

## Vetores de ataque a considerar (pensar como atacante)
- Usuário A consegue editar/excluir demanda do usuário B? (IDOR)
- Token expirado/forjado é aceito em algum caminho?
- Bypass token vaza para produção via env mal configurada?
- Input malicioso (SQLi via Drizzle raw, payload gigante, tipo inesperado)
  passa sem validação Zod?
- Falta de rate limit permite brute force de OTP?

## Classificação
Qualquer bypass de auth, IDOR, secret exposto ou bypass em produção é S1
(crítico) — pare tudo. Falta de rate limit ou validação fraca em fluxo core
costuma ser S2.

## Saída obrigatória
```
Superfície afetada: <auth | RLS | input | ownership | secret>
Risco identificado: <descrição + severidade Sx>
Vetor de ataque: <como alguém exploraria>
Mitigação: <a correção e por que fecha o vetor>
Verificação: <como testar que fechou — inclua caso negativo>
```

## Anti-patterns
- Remover a checagem de `NODE_ENV=production` no bypass "para testar".
- Confiar só na API sem RLS (ou vice-versa).
- Colocar secret em variável `EXPO_PUBLIC_*`.
- Validar ownership só no frontend.
- Silenciar erro de auth com fallback permissivo.

---
name: auth-security-guard
description: Auditoria de segurança do Opus Freelas — Clerk, JWT, RLS do Supabase, ownership de demandas, validação de input, secrets. Use sempre que a mudança tocar autenticação, autorização, permissão, ou antes de fechar qualquer correção que envolva dados de usuário.
---

# Guardião de segurança

Auth é o ponto que mais causou regressão neste projeto. Toda mudança que o toca
exige justificativa explícita de segurança na resposta.

## Modelo do projeto
Clerk emite JWT via OTP por telefone. O middleware `requireClerkAuth` em
`apps/api/src/middleware/clerk.ts` valida o Bearer token e popula `authUser`.
Não existe bypass de dev — nunca reintroduzir um.

Ownership: handlers de demanda comparam `contractor_id === auth.userId` antes de
update/delete. A API é a primeira linha de defesa; a RLS no Supabase é a última.
As duas precisam existir — confiar em uma só é achado.

## Checklist
- [ ] Endpoint protegido valida o JWT do Clerk?
- [ ] Ownership checado antes de update/delete, com 403 (não autorizado) e 404
      (inexistente) distintos?
- [ ] Existe política RLS na tabela reforçando a mesma regra?
- [ ] Input validado por Zod de `@amauc/shared` antes de qualquer query?
- [ ] Nenhum secret exposto? `EXPO_PUBLIC_*` vai para o bundle e **é público** —
      jamais colocar secret ali. Nada de secret em código ou histórico git.
- [ ] Rate limiting em OTP e em publicação de demanda?

## Vetores a considerar
Pense como atacante antes de aprovar:
- Usuário A consegue editar ou excluir demanda do usuário B? (IDOR)
- Token expirado ou forjado é aceito em algum caminho?
- Payload malformado, gigante ou de tipo inesperado passa sem validação?
- Ausência de rate limit permite brute force de código OTP?
- Query PostGIS vaza localização exata de terceiros além do necessário?

## Classificação
Bypass de auth, IDOR ou secret exposto são **S1** — pare tudo. Falta de rate
limit ou validação fraca em fluxo core costuma ser S2.

## Saída
```
Superfície: <auth | RLS | input | ownership | secret>
Risco: <descrição + severidade>
Vetor: <como alguém exploraria na prática>
Mitigação: <a correção e por que fecha o vetor>
Verificação: <teste, incluindo o caso negativo — usuário errado deve receber 403>
```

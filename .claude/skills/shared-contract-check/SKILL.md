---
name: shared-contract-check
description: |
  Garante integridade dos contratos Zod compartilhados (@amauc/shared) entre
  apps/api e apps/mobile no Opus Freelas. Use ao mexer em schemas Zod, tipos
  compartilhados, payloads de RPC, validação de input/output, ou ao ver erros
  de tipo entre frontend e backend. Gatilhos: schema, Zod, contrato, tipo,
  @amauc/shared, payload, RPC, validação, tipo divergente, TypeScript error.
---

# Verificador de contrato compartilhado — Opus Freelas

Schema Zod duplicado ou divergente entre `apps/api` e `apps/mobile` é a classe
de bug S2 mais recorrente aqui. A fonte única de verdade é `@amauc/shared`.

## Princípio
Todo tipo e validação que cruza a fronteira cliente↔servidor vive SÓ em
`packages/shared/src`. Se você encontrar um schema definido dentro de
`apps/api` ou `apps/mobile` que também existe (ou deveria existir) no outro
lado, isso é bug arquitetural — mova para `@amauc/shared` e importe dos dois.

## Localização dos contratos
- `packages/shared/src/demands/schemas.ts` — Demand (create/update/delete/response), status, urgency
- `packages/shared/src/identity/schemas.ts` e `roles.ts` — identidade e papéis
- `packages/shared/src/discovery/schemas.ts` — descoberta/filtros geo
- `packages/shared/src/index.ts` — barrel de exports

## Ao alterar um schema
1. Edite SOMENTE em `@amauc/shared`. Nunca redefina do lado consumidor.
2. Rebuild do pacote se necessário (`turbo run build` ou filter em `@amauc/shared`).
3. Verifique os dois consumidores:
   - `apps/api` — handler RPC usa `schema.safeParse(input)` e retorna 400 no erro?
   - `apps/mobile` — hook/tela usa o mesmo schema para montar/validar payload?
4. Rode type-check nos dois lados. Erro de tipo aqui = contrato quebrado.
5. Rode os testes da API (`pnpm --filter @amauc/api vitest run`).

## Teste de contrato recomendado
Um teste que importa o schema de `@amauc/shared` e valida um payload de exemplo
com os campos exatos que o mobile envia e a API espera. Se o schema mudar de um
jeito que quebra o outro lado, o teste falha antes de chegar em runtime.

Exemplo de foco: `createDemandSchema` exige `description` entre 30 e 1000 chars,
`visibilityRadius` inteiro 1–100, `urgency` no enum. Se o mobile enviar fora
disso, é erro de contrato — corrigir no lado que diverge do schema, não relaxar
o schema sem justificativa.

## Regra de ouro
Erro de tipo TypeScript entre front e back NUNCA se resolve com `as any` ou
`@ts-ignore`. A correção é alinhar ao contrato em `@amauc/shared` e propagar
para os dois lados.

## Saída
```
Schema afetado: <nome em @amauc/shared>
Mudança: <o que mudou no contrato>
Consumidores verificados: apps/api ✓/✗ · apps/mobile ✓/✗
Type-check: <resultado> · Testes: <resultado>
Risco: <onde poderia divergir em runtime>
```

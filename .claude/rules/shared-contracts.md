---
paths:
  - "packages/shared/**"
---

Este pacote é a fonte única de verdade dos contratos entre `apps/api` e
`apps/mobile`. Qualquer tipo ou validação que cruza a fronteira cliente↔servidor
vive aqui e em nenhum outro lugar.

Ao alterar um schema, verificar OS DOIS consumidores antes de considerar pronto:
o handler em `apps/api/src/rpc/` e o hook ou tela em `apps/mobile/`. Rodar
typecheck dos dois lados.

Schema duplicado dentro de `apps/api` ou `apps/mobile` é bug arquitetural, não
detalhe de estilo — mova para cá e importe dos dois lados.

Mudança que quebra compatibilidade (campo obrigatório novo, enum reduzido)
exige atualizar os dois consumidores no mesmo commit. Relaxar um schema para
"fazer passar" é proibido sem justificativa explícita do porquê a regra antiga
estava errada.

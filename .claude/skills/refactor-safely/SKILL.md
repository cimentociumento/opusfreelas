---
name: refactor-safely
description: Quebrar arquivos grandes e reduzir complexidade no Opus Freelas sem introduzir regressão. Use quando uma tela ou handler passar de ~250 linhas, quando houver lógica duplicada, ou quando o usuário pedir para reestruturar/limpar/melhorar código existente.
---

# Refatoração segura

Refatorar uma base frágil sem rede de testes é como trocar pneu com o carro
andando. Este procedimento reduz o risco.

## Regra zero: refactor nunca vai junto com fix
Corrigir bug e reestruturar código são commits separados, sempre. Misturar os
dois torna impossível saber o que quebrou quando algo quebra.

## 1. Rede de segurança antes de mexer
Antes de mover qualquer linha, garanta que existe teste cobrindo o
comportamento atual. Se não existe, **escreva primeiro** — teste de
caracterização, que documenta o que o código faz hoje (mesmo que seja
estranho), não o que deveria fazer.

Sem esse passo, você não tem como provar que a refatoração preservou o
comportamento. Nesse caso, avise o usuário do risco antes de prosseguir.

## 2. Um movimento por vez
Refatoração é uma sequência de passos pequenos e reversíveis, cada um deixando
a suite verde:
- Extrair função pura para o topo do arquivo
- Mover função extraída para módulo próprio
- Substituir chamada, rodar teste
- Repetir

Nunca "reescreve tudo e testa no final". Se quebrar, você não sabe qual dos
doze movimentos foi o culpado.

## 3. Alvos comuns neste projeto
- **Telas com 250+ linhas** — extrair: o hook de dados, os subcomponentes
  visuais, o `StyleSheet` para o fim do arquivo ou módulo próprio.
- **Lógica duplicada entre telas** — se `demands/index.tsx` e
  `demands/[id].tsx` repetem o mesmo tratamento, extrair para hook em `hooks/`.
- **Handler fazendo três coisas** — validação, autorização e persistência devem
  ser funções distintas dentro do handler, não um bloco corrido.
- **Código morto** — arquivo não importado por ninguém. Confirme com busca
  antes de remover; remover é um commit próprio.

## 4. Preservar comportamento, inclusive o esquisito
Se durante a refatoração você encontrar o que parece ser um bug, **não corrija
agora**. Anote, termine o refactor com comportamento idêntico, e trate o bug
depois com a skill `root-cause-fix`. Misturar os dois é como a base chegou onde
chegou.

## 5. Verificar
Suite verde antes e depois. No mobile, `pnpm --filter @amauc/mobile typecheck` e
validação manual nas três plataformas — o CI não cobre mobile.

## Saída
```
Alvo: <arquivo e por que precisa de refactor>
Rede de segurança: <testes que cobrem, ou "escritos agora">
Movimentos: <lista dos passos pequenos executados>
Comportamento preservado: <evidência — suite verde antes e depois>
Bugs encontrados e NÃO corrigidos: <lista para tratar depois>
```

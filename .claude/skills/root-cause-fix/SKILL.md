---
name: root-cause-fix
description: Investigar e corrigir qualquer defeito no Opus Freelas — crash, tela quebrada, RPC falhando, erro de tipo, bug multiplataforma, regressão. Aplica classificação de severidade, análise de causa raiz, TDD e diff mínimo. Use quando o usuário reportar bug, erro, algo que quebrou, não funciona, ou colar stack trace.
---

# Correção por causa raiz

O maior risco neste projeto é corrigir sintoma e introduzir regressão. Este
procedimento existe para impedir isso.

**Regra de entrada:** se você não consegue explicar em UMA frase por que o bug
ocorre, você ainda não pode editar código. Investigue primeiro.

## 1. Classificar severidade
Use a escala do CLAUDE.md (S1–S4). Declare a severidade na resposta. Se houver
S1/S2 aberto e este for S3/S4, avise o usuário e proponha priorizar o grave.

## 2. Reproduzir com evidência
Exija stack trace, log do Expo/Hono, ou o comportamento exato observado. Se não
há evidência, peça — ou reproduza você mesmo rodando o comando relevante. Nunca
corrija a partir de descrição vaga.

## 3. Isolar a causa raiz
Pergunte "por quê?" pelo menos duas vezes. Verifique nesta ordem:

1. **Ambiente** — cache pnpm/expo corrompido, env ausente, rede institucional.
   Primeira hipótese em erro intermitente.
2. **Contrato** — schema Zod em `@amauc/shared` desalinhado entre api e mobile.
   Causa muito comum aqui. Compare os dois consumidores.
3. **Implementação** — só então investigue a lógica do handler ou componente.

Nunca invente nome de tabela, coluna, endpoint ou env var. Leia o arquivo.

## 4. TDD
- **RED** — escreva o teste que falha reproduzindo o bug. Na API:
  `apps/api/src/**/*.test.ts` rodando com `pnpm --filter @amauc/api vitest run`.
- **GREEN** — menor correção que faz passar.
- **REFACTOR** — limpe se necessário, em commit separado do fix.

Erro de tipo TS/Zod é bug de contrato: corrija em `@amauc/shared` e propague.
`as any` e `@ts-ignore` não são solução.

## 5. Diff mínimo
Toque só as linhas necessárias. Reescrita de arquivo inteiro só se ele violar os
princípios do CLAUDE.md (função gigante, responsabilidades misturadas) e
declarada explicitamente como refactor, em commit separado — nesse caso use a
skill `refactor-safely`.

## 6. Verificar com evidência
Não afirme sucesso — mostre. Cole a saída do teste, o comando rodado e o
retorno. Se tocou mobile, valide em iOS, Android e Web. Confirme que a suite
inteira passa (regressão) e que nenhum novo warning apareceu no terminal.

## 7. Segurança
Se tocou auth, RLS, ownership, input ou secret, aplique `auth-security-guard`
antes de fechar.

## Quando falha
Após 2 tentativas sem sucesso no mesmo arquivo, declare explicitamente
"minha hipótese de causa raiz estava errada" e volte ao passo 3. `git revert` é
a primeira reação a um fix que quebrou algo — nunca empilhe correção sobre
correção, e nunca acumule fixes especulativos no mesmo commit.

## Formato de saída
```
Severidade: Sx — <justificativa>
Causa raiz: <uma frase>
Correção mínima: <o que muda e por quê>
Arquivos: <lista>
Evidência: <saída do teste / comando>
Risco de regressão: <onde vigiar>
```

---
name: root-cause-fix
description: |
  Fluxo disciplinado de correção de bugs para o monorepo Opus Freelas
  (Expo + Hono + Drizzle + Clerk + Supabase). Use ao investigar ou corrigir
  qualquer defeito: crash, tela quebrada, RPC falhando, erro de tipo, bug
  multiplataforma, regressão. Aplica classificação de severidade, análise de
  causa raiz, TDD e diff mínimo. Gatilhos: corrigir, bug, erro, quebrou, não
  funciona, regressão, crash, falha, stack trace.
---

# Correção por causa raiz — Opus Freelas

Base construída em vibe coding com dívida técnica. O maior risco é corrigir
sintoma e introduzir regressão. Este skill impõe disciplina.

## Regra de entrada
Se você não consegue explicar em UMA frase por que o bug ocorre, você ainda
NÃO tem permissão para editar código. Investigue primeiro.

## Passo 1 — Classificar severidade
Antes de tudo, classifique (ver CLAUDE.md §4): S1 crítico, S2 alto, S3 médio,
S4 baixo. Não trabalhe em S3/S4 se houver S1/S2 aberto. Declare a severidade.

## Passo 2 — Reproduzir com evidência
Exija stack trace, log do Expo/Hono, ou comportamento exato. Nunca corrija a
partir de descrição vaga. Se não há evidência, peça ou reproduza.

## Passo 3 — Causa raiz (não sintoma)
Pergunte "por quê?" ao menos duas vezes. Verifique nesta ordem:
1. É ambiente? (cache pnpm/expo, env ausente, rede IFC, DEV_BYPASS_TOKEN)
   — primeira hipótese em erros intermitentes.
2. É contrato? O schema Zod em `@amauc/shared` está desalinhado entre
   `apps/api` e `apps/mobile`?
3. É implementação? Só então investigue a lógica.

Nunca invente nomes de tabela, coluna, endpoint ou env var. Se não tem certeza
do schema Supabase ou do contrato Zod, leia o arquivo antes de escrever código.

## Passo 4 — TDD
- RED: escreva o teste que falha, reproduzindo o bug.
- GREEN: menor correção que faz passar.
- REFACTOR: limpe se necessário (commit separado do fix).

Erro de tipo TS/Zod é bug de contrato — corrija em `@amauc/shared` e propague.
Nunca `as any` / `@ts-ignore` como solução.

## Passo 5 — Diff mínimo
Nunca reescreva arquivo inteiro para corrigir bug localizado. Toque só as
linhas necessárias. Reescrita completa só se o arquivo violar princípios de
código (função gigante, responsabilidades misturadas) E declarada como refactor
em commit separado.

## Passo 6 — Validar
- Rodar `pnpm --filter @amauc/api vitest run` (mesmo comando do CI).
- Bug multiplataforma: validar em iOS, Android E Web.
- Confirmar zero novo warning/erro no terminal Expo/Hono.
- Rodar suite inteira (regressão).

## Passo 7 — Segurança
Se tocou auth, RLS, input ou ownership, invoque o skill `auth-security-guard`.

## Quando a correção falha
- Após 2 tentativas falhas no mesmo arquivo: declare "minha hipótese estava
  errada" e volte ao Passo 3.
- `git revert` é a primeira reação — nunca empilhe correção sobre correção.
- Proibido acumular fixes especulativos no mesmo commit.

## Formato de saída obrigatório
```
Severidade: Sx — <por quê>
Causa raiz: <uma frase>
Correção mínima: <o que muda e por quê>
Arquivos alterados: <lista>
Risco de regressão: <onde vigiar>
Teste recomendado: <comando ou passo manual>
```

## Anti-patterns
- "Deveria funcionar agora" sem ter rastreado a causa raiz.
- Corrigir no escuro sem evidência.
- Reescrever arquivo inteiro por bug pontual.
- Silenciar erro de tipo em vez de ajustar o contrato.
- Commit misturando fix + refactor + feature.

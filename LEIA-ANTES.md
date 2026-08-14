# Leia antes de extrair

Este pacote **sobrepõe** a configuração v1 que você já commitou. Nada do seu
código é tocado. Abaixo, exatamente o que muda.

## Sobrescrito (versão nova, melhor)

| Arquivo | O que muda |
|---|---|
| `CLAUDE.md` | 209 → 92 linhas. Procedimentos saíram para skills e rules, que carregam sob demanda. Mesmo conteúdo, custo de contexto muito menor. |
| `.claude/skills/root-cause-fix/SKILL.md` | Reescrito: exige evidência da verificação (saída de teste), não só afirmação de sucesso. |
| `.claude/skills/auth-security-guard/SKILL.md` | Reescrito: distingue 403 de 404, cobre vazamento de geolocalização via PostGIS. |
| `.claude/settings.json` | **Seus 6 plugins foram preservados.** Adicionados hooks e permissions. Confira a seção `enabledPlugins` depois de extrair. |

## Adicionado

```
AUDITORIA.md                       achados reais do seu repo, priorizados
INSTALL.md                         explicação da arquitetura da config
.claude/rules/*.md                 4 restrições path-scoped (novo recurso)
.claude/skills/ui-review/          revisão visual com Playwright MCP
.claude/skills/refactor-safely/    quebrar arquivos grandes sem regressão
.claude/agents/*.md                2 subagents de contexto isolado
```

## Preservado (nada tocado)

`AGENTS.md` · `rules.md` · `.cursorrules` · `TEST_DEMANDS.md` ·
`pre_projeto.md` · `.planning/` · todo o código em `apps/`, `packages/`,
`supabase/`

## Um resíduo para limpar

A skill `shared-contract-check` virou a rule `shared-contracts.md`. A rule é
melhor: carrega só quando você toca `packages/shared/**`, em vez de sempre.
Manter as duas duplica a instrução.

```bash
git rm -r .claude/skills/shared-contract-check
```

## Extração

```bash
cd /caminho/para/opusfreelas
git checkout -b chore/claude-setup-v2

unzip -o ~/Downloads/opusfreelas-claude-setup.zip -d .

git rm -r .claude/skills/shared-contract-check
git add CLAUDE.md AUDITORIA.md INSTALL.md .claude/
git status                       # confira antes de commitar
git commit -m "chore: atualiza config do Claude Code (rules, agents, hooks)"
```

O `git status` antes do commit é o que garante que nada inesperado entrou.
Se algo parecer errado, `git checkout -- <arquivo>` desfaz.

## Segurança da operação

Você está numa branch nova, então a `main` fica intacta. Se quiser desfazer
tudo:

```bash
git checkout main
git branch -D chore/claude-setup-v2
```

## Depois de instalar

```bash
claude mcp add --scope project playwright -- npx -y @playwright/mcp@latest
```

Playwright é o que dá olhos ao agente para revisar UI no alvo web. Sem ele, a
skill `ui-review` funciona só parcialmente.

Primeiro comando sugerido numa sessão nova:

```
Leia AUDITORIA.md e me ajude a resolver os itens 1 e 2.
```

---

## Atualização — migração de UI

Adicionados nesta versão:

- `BRIEF-MIGRACAO-UI.md` — plano de execução da migração para NativeWind +
  React Native Reusables, com versões e armadilhas já verificadas
  empiricamente. É o documento para apontar ao Claude Code.
- `.claude/skills/design-system/SKILL.md` — direção visual limpa e neutra
  (Linear/Notion/Vercel), que é a estética do shadcn implementada pelo RNR.

A skill `ui-review` continua válida, mas a partir da Fase 3 da migração os
componentes vêm de `components/ui/` (RNR) em vez de `components/`.

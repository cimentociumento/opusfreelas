# Setup Claude Code — Opus Freelas

Configuração construída a partir da leitura do repositório real e da
documentação oficial da Anthropic sobre como direcionar o Claude Code
(`claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more`,
junho/2026).

## Arquitetura da configuração

A doc oficial define sete superfícies de instrução, cada uma com custo de
contexto e autoridade diferentes. Esta configuração usa quatro:

| Superfície | O que vai nela | Quando carrega |
|---|---|---|
| `CLAUDE.md` | fatos permanentes: estrutura, comandos, escala de severidade | sempre |
| `.claude/rules/` | restrições por diretório, com `paths:` | só ao tocar o diretório |
| `.claude/skills/` | procedimentos: corrigir bug, auditar auth, revisar UI | ao ser invocada |
| `.claude/agents/` | trabalho isolado que devolve só o resumo | ao ser chamada |
| `.claude/settings.json` | garantias determinísticas (hooks) e permissões | fora do contexto |

O princípio: `CLAUDE.md` fica curto (92 linhas) porque cada linha custa tokens
em toda sessão. Procedimento longo vira skill. Restrição de diretório vira rule
com `paths:`. Regra que **não pode** ser violada vira hook — instrução em
prosa o modelo às vezes ignora sob pressão, hook não.

## Instalação

```bash
cd /caminho/para/opusfreelas
git checkout -b chore/claude-setup

# Copie o conteúdo desta pasta para a raiz do repo
cp CLAUDE.md AUDITORIA.md /caminho/para/opusfreelas/
cp -r .claude /caminho/para/opusfreelas/

git add CLAUDE.md AUDITORIA.md .claude/
git commit -m "chore: configura Claude Code (rules, skills, agents, hooks)"
```

## MCP: dar olhos ao agente

O ganho maior para UI vem de o agente **ver** o resultado, não de trocar de
biblioteca. O app já roda em `react-native-web`, então o Playwright MCP
funciona nele.

```bash
claude mcp add --scope project playwright -- npx -y @playwright/mcp@latest
claude mcp add --scope project supabase -- npx -y @supabase/mcp-server-supabase@latest
```

Playwright dá screenshot, navegação e inspeção da árvore de acessibilidade —
é o que torna a skill `ui-review` útil de verdade. Supabase MCP deixa o agente
consultar RLS e logs direto, em vez de você colar print.

Com o app rodando (`cd apps/mobile && pnpm web`), o ciclo vira:
capturar → propor → editar → verificar.

## Como usar

```bash
cd /caminho/para/opusfreelas
claude
```

As skills disparam por contexto. Exemplos:

```
O botão de excluir não funciona no web.        → root-cause-fix
Revisa a segurança do fluxo de OTP.            → auth-security-guard
A tela de criar demanda está confusa.          → ui-review
Quebra o [id].tsx, tá com 460 linhas.          → refactor-safely
```

Subagents você chama explicitamente:
```
Roda o codebase-auditor no projeto inteiro.
Usa o test-writer pra cobrir os handlers de discovery.
```

Comece por aqui, na ordem:
```
Leia AUDITORIA.md e me ajude a resolver o item 1 e 2.
```

## Sobre UI: a recomendação é não migrar

Pesquisei o estado atual do ecossistema (Tamagui, gluestack-ui v3, NativeWind,
React Native Reusables, Shopify Restyle). Todos são boas bibliotecas em 2026 —
Tamagui lidera em performance por compilar estilos em build time, gluestack v3
sucedeu o NativeBase, NativeWind traz Tailwind para RN.

Mesmo assim, **a recomendação para este projeto é não adotar nenhuma agora.**

O `apps/mobile/components/theme.ts` já tem design tokens bem estruturados
(cores, spacing, borderRadius, typography) e há componentes base próprios
(Button, Card, Toast, AlertModal, ErrorState). Isso é exatamente o que uma
biblioteca daria. Migrar significaria reescrever as quatro telas de demanda
numa base que já é frágil, sem testes de mobile no CI, com prazo acadêmico.
O custo é alto e o ganho para o MVP é próximo de zero.

O que de fato melhora a UI aqui é o agente conseguir ver a tela e revisar
estados (vazio, carregando, erro), contraste, alvo de toque e hierarquia — que
é o que a skill `ui-review` faz. Se depois do MVP o projeto continuar, aí sim
vale avaliar NativeWind, que é o caminho de migração mais incremental.

## Relação com os arquivos existentes

O repositório já tem `rules.md`, `.cursorrules` e `AGENTS.md`. O `rules.md` é o
melhor documento de engenharia do projeto — o diagnóstico dos cinco problemas
raiz está correto e o `CLAUDE.md` foi construído em cima dele, não contra.

Papéis sugeridos:
- `rules.md` — documento humano de referência, explica o porquê
- `CLAUDE.md` — operacional do agente, curto e factual
- `AGENTS.md` / `.cursorrules` — gerados pelo GSD, deixe o GSD gerenciar

Vale anotar isso no topo de cada arquivo para o próximo dev não se perder.

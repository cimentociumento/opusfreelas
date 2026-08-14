# Auditoria inicial — Opus Freelas

Varredura estática do repositório em 2026-08-07. Achados classificados pela
escala do CLAUDE.md. Não inclui análise dinâmica (app rodando) nem revisão de
RLS no painel do Supabase — esses exigem ambiente ativo.

---

## S2 — Alto

### 1. `apps/mobile/assets/` contém código-fonte duplicado e divergente
```
apps/mobile/assets/components/DevModeToggle.tsx    ← DIVERGENTE do original
apps/mobile/assets/components/DevAuthWrapper.tsx   ← idêntico ao original
apps/mobile/assets/hooks/use-development-mode.ts
apps/mobile/assets/app/index.tsx
apps/mobile/assets/shared-patch/dev-mode.ts
```
`assets/` deveria conter só recursos estáticos. Há cópias de componentes que
também existem em `components/` e `hooks/`. O `DevModeToggle` das duas pastas
**diverge** — ou seja, existem duas versões diferentes do controle de dev mode
no repositório.

Por que é S2: alguém (humano ou IA) vai eventualmente editar a cópia errada e
passar horas sem entender por que a mudança não surte efeito. Já é armadilha
ativa para o próprio agente.

Correção: confirmar qual versão está em uso (buscar os imports), remover a
pasta inteira em um commit próprio de limpeza.

### 2. Nenhum gate automático para o mobile
O CI roda apenas `pnpm --filter @amauc/api vitest run`. O app mobile — que é o
produto — não tem typecheck nem teste rodando em CI, e tem apenas 2 arquivos de
teste contra 4 telas com 250–460 linhas.

Por que é S2: regressão no mobile só é descoberta manualmente, o que num
projeto com prazo acadêmico significa descobrir em cima da entrega.

Correção: adicionar um job ao `ci.yml` rodando `typecheck` e `test` do mobile.
Começar com typecheck, que já pega a classe de bug de contrato.

---

## S3 — Médio

### 3. Telas muito acima do limite de complexidade
```
apps/mobile/app/(app)/demands/[id].tsx        460 linhas
apps/mobile/app/(app)/demands/create.tsx      257 linhas
apps/mobile/app/(app)/demands/index.tsx       254 linhas
apps/mobile/app/(app)/demands/available.tsx   245 linhas
apps/mobile/components/AlertModal.tsx         194 linhas
```
O próprio `rules.md` do projeto define ~40 linhas como limite para funções e
manda quebrar antes de corrigir. Essas telas provavelmente misturam busca de
dados, lógica de estado, renderização e estilos no mesmo arquivo.

Por que é S3 e não S2: funciona hoje. Mas é o principal fator que faz correções
de IA gerarem regressão — quanto maior o arquivo, maior a chance de a IA
reescrever demais.

Correção: usar a skill `refactor-safely`, uma tela por vez, começando por
`[id].tsx`. Escrever teste de caracterização antes.

### 4. Arquivo-lixo na raiz do repositório
```
{console.error(e)
```
Arquivo de 225 bytes cujo nome é um fragmento de código. Conteúdo é um comando
PowerShell mal escapado (`C:\opusfreelas> ... corepack.js pnpm --filter
@amauc/api exec node --import tsx -e import("@amauc/shared")...`). Resíduo de um
comando que virou redirecionamento por acidente.

Correção: `git rm '{console.error(e)'`. Trivial, mas sinaliza que o repositório
não tem revisão de diff antes do commit.

### 5. Documentação de agente fragmentada e potencialmente conflitante
Coexistem `AGENTS.md` (formato GSD), `.cursorrules` (Cursor), `rules.md`
(escrito para Gemini) e agora `CLAUDE.md`. Os três primeiros repetem stack e
convenções com graus diferentes de detalhe.

Por que importa: instrução duplicada em quatro lugares diverge com o tempo, e
cada agente lê um conjunto diferente. `rules.md` é o de melhor qualidade
conceitual — vale mantê-lo como documento humano de referência e deixar
`CLAUDE.md` como o operacional do agente.

Correção: decidir explicitamente o papel de cada arquivo e anotar isso no topo
de cada um. Não precisa deletar nada agora.

---

## S4 — Baixo

### 6. `clerk-expo/` na raiz do monorepo
Diretório com estrutura completa de app Expo (`components/`, `hooks/`,
`constants/`, `scripts/`, `.vscode/`) fora de `apps/` e fora do
`pnpm-workspace.yaml`. Parece template de referência do Clerk mantido para
consulta.

Correção: se é referência, mover para `docs/reference/` ou remover e linkar o
repositório original no README. Se é código vivo, deveria estar em `apps/`.

---

## Não verificável estaticamente

Estes pontos precisam do ambiente rodando e são os de maior risco real:

- **RLS efetiva no Supabase** — as migrations criam políticas, mas só o painel
  ou uma query de teste confirma que estão ativas e corretas. Tabela com RLS
  desabilitada é S1.
- **Ownership em todos os handlers** — `demands.ts` usa `getOwnedDemand`, mas
  `discovery.ts` e `identity.ts` precisam de leitura dirigida.
- **Fluxo OTP ponta a ponta** — o histórico do projeto indica fragilidade aqui.
- **Comportamento real em iOS/Android/Web** — divergências de plataforma só
  aparecem executando.

Para cobrir isso, rode o subagent `codebase-auditor` com o projeto aberto, e
depois valide o fluxo OTP manualmente nas três plataformas.

---

## Ordem sugerida de ataque

1. Remover o arquivo-lixo da raiz (5 minutos, zero risco)
2. Resolver a duplicação em `assets/` (armadilha ativa para o agente)
3. Adicionar typecheck do mobile ao CI (gate barato, alto retorno)
4. Rodar `codebase-auditor` para os achados que exigem leitura profunda
5. Validar RLS e ownership com o app rodando
6. Só então refatorar as telas grandes

# CLAUDE.md — Opus Freelas

> Documento de engenharia lido pelo Claude Code antes de qualquer alteração.
> Complementa (não substitui) `rules.md`, `.cursorrules` e `AGENTS.md`. Em caso
> de conflito, este arquivo tem precedência para comportamento do agente Claude.

---

## 1. O que é o projeto

Marketplace multiplataforma de serviços manuais e rurais na região da AMAUC
(Santa Catarina). Projeto Integrador do IFC Campus Concórdia. V1 prioriza o
**contratante**: publicar demandas e descobrir prestadores por localidade.
Fechamento do serviço acontece fora da plataforma (telefone/WhatsApp).

Contexto crítico: base construída em *vibe coding*, com dívida técnica que já
causa regressões quando IAs corrigem sintoma em vez de causa. A missão do
agente não é adicionar features — é **estabilizar, corrigir e blindar** o que
existe, sem introduzir regressões.

## 2. Stack e arquitetura

Monorepo pnpm + Turborepo:
- `apps/mobile` — Expo SDK 55 (RN 0.83, React 19.2), expo-router, React Query, alvo iOS/Android/Web
- `apps/api` — Hono 4 (rotas RPC-style), Drizzle ORM, Node 22
- `packages/shared` (`@amauc/shared`) — schemas Zod e tipos compartilhados (fonte única de verdade dos contratos)
- `supabase/` — migrations, RLS, Storage; PostgreSQL 17 + PostGIS 3.5

Fluxo de dados obrigatório (nunca curto-circuitar):
`UI (Expo) → hook/provider → cliente RPC → handler Hono → Supabase (RLS)`

Auth: **Clerk** (OTP por telefone + JWT). Há um `DEV_BYPASS_TOKEN` que só vale
fora de produção — o middleware bloqueia bypass quando `NODE_ENV=production`.

## 3. Comandos essenciais

```bash
pnpm install --frozen-lockfile        # instalar (lockfile é autoridade)
pnpm --filter @amauc/api vitest run    # rodar testes da API (mesmo comando do CI)
pnpm --filter @amauc/api test          # idem via script
turbo run test                         # todos os pacotes
turbo run lint                         # lint do monorepo
cd apps/mobile && pnpm start           # Expo (--web / --ios / --android)
cd apps/api && pnpm dev                # API local (porta 3000)
```

O CI (`.github/workflows/ci.yml`) roda `pnpm --filter @amauc/api vitest run` em
Node 22. Uma correção não está pronta se quebra o CI.

---

## 4. Classificação de severidade de defeitos

Todo defeito é classificado ANTES de qualquer ação. Baseado em IEEE 1044
(classificação de anomalias) e CVSS (segurança). Severidade = impacto ×
probabilidade. Prioridade de resolução segue a ordem S1 → S4. Na dúvida entre
dois níveis, escolha sempre o mais grave.

### S1 — Crítico · *pare tudo e resolva antes de qualquer coisa*
Qualquer um destes basta:
- Bypass de autenticação; usuário acessa ou altera demanda de outro (`contractor_id` != `userId` não barrado)
- `DEV_BYPASS_TOKEN` aceito em produção, ou secret exposto no bundle/repo/histórico git
- Perda ou corrupção de dados de demandas/perfis
- Crash irrecuperável no fluxo core (login OTP, publicar demanda, descoberta) em qualquer plataforma
- RLS ausente ou permissiva permitindo leitura/escrita indevida
- CVSS ≥ 9.0

### S2 — Alto · *resolver no mesmo ciclo, logo após S1*
- Fluxo core quebrado em ao menos uma plataforma (ex.: criar demanda falha no Web mas funciona no mobile)
- Contrato Zod (`@amauc/shared`) divergente entre `apps/api` e `apps/mobile` gerando erro em runtime
- Consulta PostGIS retornando resultados errados (raio/município incorretos)
- Degradação de UX perceptível (timeout, tela travada > 3s) em rede típica rural
- CVSS 7.0–8.9

### S3 — Médio · *próximo ciclo planejado*
- Bug em edge case documentado ou fluxo secundário
- Inconsistência funcional entre plataformas em feature não-core
- Mensagem de erro ausente/incorreta sem quebrar o fluxo
- CVSS 4.0–6.9

### S4 — Baixo · *backlog*
- Cosmético (espaçamento, cor, texto, i18n)
- Código funcional abaixo do padrão (lint, naming) sem impacto de comportamento
- Refactor sugerido sem impacto funcional
- CVSS < 4.0

### Matriz de triagem rápida
| | Impacto alto | Impacto baixo |
|---|---|---|
| **Frequência alta** | S1 / S2 | S2 / S3 |
| **Frequência baixa** | S2 / S3 | S3 / S4 |

Regra de bloqueio: **não iniciar S3/S4 enquanto houver S1/S2 aberto.** Um S1
ativo bloqueia todo o resto.

---

## 5. Protocolo de correção (obrigatório, toda severidade)

Sem permissão para editar código antes de completar este ciclo. Se não
consegue explicar em uma frase por que o bug ocorre, ainda não pode corrigir.

1. **Reproduzir com evidência concreta** — stack trace, log do Expo/Hono, ou comportamento exato. Nunca corrigir a partir de descrição vaga.
2. **Causa raiz, não sintoma** — aplicar "por quê?" ao menos 2 vezes. Perguntar: é implementação, ou o contrato `@amauc/shared` está desalinhado?
3. **Descartar causa ambiental antes de tocar em lógica** — cache pnpm/expo, env ausente, rede institucional (IFC), `DEV_BYPASS_TOKEN`. Ambiente é a primeira hipótese em erros intermitentes.
4. **Audit de segurança** (ver §7) se a mudança toca auth, RLS, input ou ownership.
5. **TDD** — escrever teste que falha (RED), corrigir minimamente (GREEN), refatorar se preciso (REFACTOR). Ver §6.
6. **Menor diff possível.** Tocar > 1 arquivo sem necessidade clara é sinal de que a causa raiz não foi isolada.
7. **Validar nas plataformas afetadas** (§8) e confirmar zero regressão (suite passando).

Formato de resposta ao propor correção:
> **Severidade:** Sx — <por quê>
> **Causa raiz:** <uma frase>
> **Correção mínima:** <o que muda e por quê>
> **Arquivos:** <lista> · **Risco de regressão:** <onde> · **Teste:** <comando>

### Quando uma correção falha
- Após 2 tentativas falhas no mesmo arquivo, declarar "minha hipótese de causa raiz estava errada" e voltar ao passo 2.
- `git revert` é a primeira reação a uma correção que quebra algo — nunca empilhar correção sobre correção.
- Nunca acumular fixes especulativos ("troco isso, isso e isso pra ver qual resolve").

---

## 6. Plano de testes

Pirâmide de testes aplicada ao monorepo. Nenhum fix é "concluído" sem teste
que o cubra.

**Unitário (Vitest, `apps/api`)** — base da pirâmide, maioria dos testes.
Lógica de domínio pura: mapeadores (`demands-mapper`), autorização (`authz/roles`),
validação de schema. Rápidos, sem rede. Já existem: `roles.test.ts`,
`rpc-features.test.ts`, `health.test.ts`.

**Integração (Vitest + Supabase de teste)** — handlers RPC end-to-end contra
um banco real de teste: `demands.create/update/delete/list`, ownership, RLS.
Testar o caminho de erro (token inválido, campo vazio, demanda de outro dono),
não só o happy path.

**Contrato (`@amauc/shared`)** — garantir que os schemas Zod usados por
`apps/api` e `apps/mobile` são os mesmos. Um teste que importa o schema de
ambos os lados e falha se divergir previne toda uma classe de bug S2.

**E2E (Playwright/Maestro)** — só fluxos críticos: publicar demanda, buscar por
município/raio, editar/excluir com ownership. Rodar em iOS, Android e Web.

Disciplina de teste:
- Escrever o teste ANTES do fix (RED-GREEN-REFACTOR).
- Bug marcado "multiplataforma" não é resolvido até passar em iOS, Android E Web.
- Erros de tipo TS/Zod são bugs de contrato — corrigir em `@amauc/shared` e propagar, nunca silenciar com `as any`/`@ts-ignore`.
- Regressão: rodar a suite inteira antes de considerar pronto.

---

## 7. Segurança (checklist obrigatório em toda mudança que toca auth/dados)

- [ ] Todo handler que lê/escreve demanda valida ownership (`contractor_id === userId`)?
- [ ] RLS no Supabase reforça isso como última linha de defesa (não confiar só na API)?
- [ ] JWT do Clerk validado em todos os endpoints protegidos?
- [ ] `DEV_BYPASS_TOKEN` continua bloqueado quando `NODE_ENV=production`?
- [ ] Inputs validados por Zod (tipo, tamanho, formato) antes de qualquer query?
- [ ] Nenhum secret em código, bundle (`EXPO_PUBLIC_*` é público!) ou histórico git?
- [ ] Rate limiting em endpoints sensíveis (OTP, publicação de demanda)?

Toda alteração em Clerk/OTP/`DEV_BYPASS_TOKEN` exige justificativa explícita de
segurança na resposta — é o ponto que mais causou regressão neste projeto.

---

## 8. Multiplataforma (Expo iOS/Android/Web)

Bug multiplataforma exige teste nas três antes de fechar. Pontos que divergem:
- **Alerts**: usar o helper cross-platform existente (`showAlert` / `use-cross-alert`), nunca `Alert.alert` direto — quebra no Web.
- **AsyncStorage**: indisponível no Web; há fallback. Não assumir persistência idêntica.
- **Deep links / expo-router**: parsing de token OTP difere iOS vs Android.
- **Touchables**: `TouchableOpacity` tem comportamento pobre no Web; preferir `Button` com handlers normais.
- **Timeouts de rede**: mais generosos no mobile (rede rural intermitente).

---

## 9. Princípios de código inegociáveis

| Princípio | Aplicação no Opus Freelas |
|---|---|
| Single Responsibility | Uma rota Hono = um recurso; um hook RN = uma coisa |
| DRY | Tipos/validações só em `@amauc/shared`; schema duplicado é bug arquitetural |
| Nomes revelam intenção | Proibido `data`, `temp`, `handleStuff`, `novaFuncao2` |
| Funções pequenas | > ~40 linhas ou > 2 `if` aninhados → quebrar antes de corrigir |
| Fail fast | Nunca `catch {}` vazio; logar com contexto `[modulo.funcao]` |
| Sem gambiarra silenciosa | `as any` / `eslint-disable` só com comentário + TODO de remoção |
| Camadas | UI nunca fala direto com Supabase |

Padrões: TypeScript strict, sem `any` salvo exceção justificada. Conventional
Commits (`fix(api): ...`, `refactor(shared): ...`). Um commit = uma causa raiz.
Branch `fix/<area>-<descricao>`; nunca corrigir bug ativo direto na `main`.

---

## 10. Integração com o workflow GSD

O projeto usa comandos GSD para manter planejamento sincronizado. Para
mudanças que alteram arquivos, prefira entrar por um comando GSD quando
existir (`/gsd-debug` para investigação, `/gsd-quick` para fixes pequenos).
Se o usuário pedir para agir direto, siga o protocolo da §5 mesmo assim.

---

*Documento vivo. Atualize quando um novo padrão de erro recorrente for
identificado (nova causa ambiental, nova dívida técnica). Registre causas
ambientais em `docs/runbooks/` para não re-diagnosticar do zero.*

# Opus Freelas

Marketplace de serviços manuais e rurais na região da AMAUC (SC). Projeto
Integrador — IFC Campus Concórdia. V1 prioriza o **contratante**: publicar
demandas e descobrir prestadores por localidade. Fechamento do serviço acontece
fora da plataforma (telefone/WhatsApp).

Estado: base construída em vibe coding, com dívida técnica conhecida. A missão
agora é **estabilizar** — corrigir, blindar e reduzir fragilidade sem
introduzir regressão. Ver `AUDITORIA.md` para os achados atuais.

## Estrutura

```
apps/mobile      Expo SDK 55 (RN 0.83, React 19.2) · expo-router · iOS/Android/Web
apps/api         Hono 4 · rotas RPC-style · Drizzle · Node 22
packages/shared  @amauc/shared — schemas Zod (fonte única dos contratos)
supabase/        migrations · RLS · PostgreSQL 17 + PostGIS
.planning/       artefatos GSD (fases, pesquisa, contexto)
```

Fluxo de dados obrigatório — nunca curto-circuitar:
`UI → hook/provider → cliente RPC → handler Hono → Supabase (RLS)`

Auth: **Clerk** (OTP por telefone + JWT). Não existe bypass de autenticação
para dev — todo request passa por verificação real de JWT do Clerk.

## Comandos

```bash
pnpm install --frozen-lockfile          # lockfile é autoridade
pnpm --filter @amauc/api vitest run     # testes API (idêntico ao CI)
pnpm --filter @amauc/mobile typecheck   # tsc --noEmit no mobile
pnpm --filter @amauc/mobile test        # jest-expo
turbo run test                          # tudo
cd apps/api && pnpm dev                 # API :3000
cd apps/mobile && pnpm web              # Expo web :8081 (alvo p/ inspeção visual)
```

CI (`.github/workflows/ci.yml`) roda **só** os testes da API. Uma correção que
quebra o CI não está pronta. Mobile não tem gate automático — validar à mão.

## Severidade de defeitos (IEEE 1044 + CVSS)

Classifique ANTES de agir. Prioridade S1 → S4. Na dúvida entre dois níveis,
escolha o mais grave. **Não inicie S3/S4 com S1/S2 aberto.**

- **S1 Crítico** — bypass de auth; usuário acessa/altera demanda de outro (IDOR);
  bypass aceito em produção; secret exposto; perda de dados; crash no fluxo core
  (login OTP, publicar demanda, descoberta); RLS ausente/permissiva. CVSS ≥ 9.0.
- **S2 Alto** — fluxo core quebrado em ao menos uma plataforma; contrato Zod
  divergente entre api e mobile gerando erro em runtime; PostGIS retornando raio
  ou município errado; travamento > 3s em rede rural. CVSS 7.0–8.9.
- **S3 Médio** — edge case documentado; fluxo secundário; inconsistência
  funcional em feature não-core; mensagem de erro ausente. CVSS 4.0–6.9.
- **S4 Baixo** — cosmético; lint/naming; refactor sem impacto funcional. CVSS < 4.0.

Matriz: impacto alto + frequência alta → S1/S2 · impacto baixo + frequência
baixa → S3/S4.

## Regras de trabalho

Procedimentos detalhados vivem em `.claude/skills/` e carregam sob demanda:
- `root-cause-fix` — qualquer bug: severidade → causa raiz → TDD → diff mínimo
- `auth-security-guard` — tudo que toca Clerk, RLS, ownership, secrets
- `ui-review` — mudanças visuais, inspeção com Playwright MCP no alvo web
- `refactor-safely` — quebrar arquivos grandes sem regressão

Restrições por diretório vivem em `.claude/rules/` e carregam só quando o
diretório é tocado.

Não-negociável em toda correção:
1. Evidência concreta antes de editar (stack trace, log, repro). Nunca no escuro.
2. Causa raiz, não sintoma. Se não explica o bug em uma frase, não corrija ainda.
3. Ambiente é a primeira hipótese em erro intermitente (cache pnpm/expo, env, rede).
4. Diff mínimo. Nunca reescrever arquivo inteiro por bug pontual.
5. Após 2 tentativas falhas: declare a hipótese errada e reinvestigue.
6. `git revert` é a primeira reação a fix que quebra algo — nunca empilhar.

Commits: Conventional Commits, um commit = uma causa raiz. Branch
`fix/<area>-<desc>`. Nunca corrigir bug ativo direto na `main`.

## Convenções de código

TypeScript strict. Sem `any` / `@ts-ignore` — erro de tipo entre front e back é
bug de contrato, corrige em `@amauc/shared` e propaga. Sem `catch {}` vazio:
logar com contexto `[modulo.funcao]`. Função > ~40 linhas ou > 2 `if` aninhados
deve ser quebrada antes de receber correção. Nomes revelam intenção — proibido
`data`, `temp`, `handleStuff`.

UI: design tokens em `apps/mobile/components/theme.ts` são a fonte única de
cores, spacing, radius e tipografia. Nunca hardcode valor de estilo.

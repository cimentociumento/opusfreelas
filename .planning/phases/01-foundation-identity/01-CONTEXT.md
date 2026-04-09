# Phase 1: Foundation & Identity - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Estabelecer a base multiplataforma de identidade e acesso para o produto, cobrindo autenticacao, sessao e separacao de papeis (contratante/prestador) com um baseline tecnico executavel para evolucao das proximas fases.

</domain>

<decisions>
## Implementation Decisions

### Authentication Stack
- **D-01:** Stack de auth no V1: `Clerk (Auth) + JWT sessions + Supabase (BaaS principal) + Firebase (suporte)`.
- **D-02:** Recuperacao de acesso no V1 usa e-mail de backup.
- **D-03:** Fluxo de onboarding com conta unica e papeis gerenciados no perfil (sem separar apps/contas).

### Session Policy
- **D-04:** Sessao curta/estrita no V1 (24h) com novo login mais frequente.
- **D-05:** Multiplos dispositivos permitidos, com opcao de encerrar todas as sessoes.

### Roles & Authorization
- **D-06:** Usuario pode atuar nos dois papeis (contratante e prestador) na mesma conta.
- **D-07:** Autorizacao em modo misto no V1: validacoes principais no backend, com reforco na camada de app.

### Technical Baseline
- **D-08:** Interface de API inicial em estilo RPC para auth/identidade.
- **D-09:** Meta de entrega da fase 1: ambiente local + CI funcional (sem staging/producao nesta fase).
- **D-10:** Observabilidade minima ja inclui logs estruturados, erros, metricas e tracing.

### Claude's Discretion
- Detalhes de modelagem interna de claims/permissoes JWT.
- Estrategia de organizacao de modulos/servicos para identidade no repositorio.
- Definicao de ferramentas especificas para tracing/metrics compativeis com a stack.

</decisions>

<specifics>
## Specific Ideas

- Priorizar robustez de login/identidade no inicio para sustentar as fases de demanda e descoberta.
- Combinar provedores (Clerk, Supabase, Firebase) para fortalecer seguranca e operacao desde a base.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope
- `.planning/ROADMAP.md` — objetivo da fase 1, criterios de sucesso e ordem de evolucao.
- `.planning/REQUIREMENTS.md` — requisitos `AUTH-01`, `AUTH-02`, `AUTH-03` mapeados para a fase 1.
- `.planning/PROJECT.md` — principios de produto, foco contractor-first e restricoes iniciais.

### Research Inputs
- `.planning/research/SUMMARY.md` — recomendacoes de stack e riscos para auth/identidade no contexto AMAUC.
- `.planning/research/STACK.md` — contexto de escolhas tecnicas para base multiplataforma e auth.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Nenhum asset de codigo reutilizavel identificado ainda (repositorio sem base de aplicacao implementada).

### Established Patterns
- Ainda nao existem padroes de codigo estabelecidos; a fase 1 define os primeiros padroes de auth/identidade.

### Integration Points
- Integracao inicial sera criada nesta fase entre camada de autenticacao, camada de dados e contratos de API.

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation-identity*
*Context gathered: 2026-04-09*

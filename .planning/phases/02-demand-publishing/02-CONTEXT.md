# Phase 2: Demand Publishing - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Implementar o ciclo de publicacao e gestao de demandas do contratante no V1, incluindo criacao, edicao, encerramento/reabertura e regras de visibilidade geografica por raio/municipio, com validacoes de entrada para evitar dados malformados.

</domain>

<decisions>
## Implementation Decisions

### Demand Fields
- **D-01:** Campo de tipo de servico usa taxonomia predefinida com opcao `outro` + texto livre.
- **D-02:** Urgencia no V1 usa 4 niveis: `baixa`, `media`, `alta`, `urgente_hoje`.
- **D-03:** Localidade da demanda exige `municipio` + coordenadas (`lat/lng`) no momento da publicacao.

### Visibility Rules (DEMD-03)
- **D-04:** O contratante escolhe o raio de visibilidade da demanda na publicacao.
- **D-05:** Demandas podem cruzar municipio quando estiverem dentro do raio definido.
- **D-06:** Regra de matching de visibilidade no V1 sera orientada por distancia/raio (nao bloqueada por municipio estrito).

### Demand Lifecycle (DEMD-02)
- **D-07:** Estados usados na fase 2: `aberta`, `em_contato`, `encerrada`.
- **D-08:** Contratante pode editar demanda enquanto nao estiver `encerrada`.
- **D-09:** Nenhum campo e imutavel no V1 (todos editaveis enquanto `aberta` ou `em_contato`).
- **D-10:** Reabertura e permitida no V1 para demandas encerradas.

### Validation and Safety
- **D-11:** Descricao e obrigatoria com limite minimo/maximo (target inicial: 30-1000 caracteres).
- **D-12:** Anti-spam por cooldown entre publicacoes por usuario (duracao exata definida no planejamento).
- **D-13:** Coordenadas invalidas ou fora da area suportada bloqueiam publicacao com mensagem de erro.

### Claude's Discretion
- Duracao exata do cooldown anti-spam no V1.
- Estrategia de mensagem de erro e copy para cada validacao.
- Definicao final de enums e nomes de campos no contrato RPC/REST.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase and Requirement Scope
- `.planning/ROADMAP.md` — objetivo e criterios de sucesso da fase 2 (Demand Publishing).
- `.planning/REQUIREMENTS.md` — requisitos `DEMD-01`, `DEMD-02`, `DEMD-03`.
- `.planning/PROJECT.md` — restricoes de produto (AMAUC-first, fechamento externo, contractor-first).

### Prior Phase Decisions
- `.planning/phases/01-foundation-identity/01-CONTEXT.md` — decisoes de identidade/autorizacao que impactam ownership de demanda.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/rpc/router.ts` — envelope RPC ja existente, reutilizavel para procedimentos de demanda.
- `apps/api/src/rpc/identity.ts` — padrao de handlers com Zod + acesso Supabase.
- `apps/api/src/middleware/clerk.ts` — autenticacao/jwt para proteger rotas/procedures de demanda.
- `apps/mobile/lib/supabase.ts` — cliente Supabase com token Clerk, util para futuras telas de demanda.

### Established Patterns
- API em Hono + modules por dominio (`middleware`, `rpc`, `sessions`, `authz`).
- Validacao de entrada com Zod e resposta 4xx explicita para input invalido.
- Autorizacao reforcada no backend (ownership e role checks no servidor).

### Integration Points
- Novos handlers de demanda devem integrar no `POST /rpc` existente.
- Persistencia de demanda deve reutilizar Supabase/Postgres com regras de ownership por `clerk_user_id`.
- Fluxo mobile pode usar estado de sessao Clerk ja implementado para publicar/editar demanda.

</code_context>

<specifics>
## Specific Ideas

- Separar claramente no UX: contratante publica `demanda`; prestador divulga `perfil/oferta`.
- Priorizar friccao baixa no publish flow, mantendo validacoes minimas obrigatorias.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-demand-publishing*
*Context gathered: 2026-04-28*
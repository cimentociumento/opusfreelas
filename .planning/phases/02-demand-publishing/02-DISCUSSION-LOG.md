# Phase 2: Demand Publishing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 02-demand-publishing
**Areas discussed:** Demand Fields, Visibility Scope, Lifecycle Edit/Close, Validation Rules

---

## Demand Fields

| Option | Description | Selected |
|--------|-------------|----------|
| taxonomy_only | Apenas categorias predefinidas (lista fechada) | |
| taxonomy_plus_other | Categorias predefinidas + opcao "outro" com texto livre | ? |
| free_text | So texto livre | |

**User's choice:** `taxonomy_plus_other`
**Notes:** Mantem padronizacao sem bloquear casos fora da taxonomia inicial.

| Option | Description | Selected |
|--------|-------------|----------|
| enum_3 | Baixa / Media / Alta | |
| enum_4 | Baixa / Media / Alta / Urgente-hoje | ? |
| deadline_only | Sem urgencia explicita, so prazo/data | |

**User's choice:** `enum_4`
**Notes:** Captura urgencia operacional local sem complexidade extra.

| Option | Description | Selected |
|--------|-------------|----------|
| municipio_bairro | Municipio obrigatorio + bairro/localidade textual | |
| municipio_coords | Municipio + coordenadas (lat/lng) obrigatorias | ? |
| municipio_only | So municipio no cadastro da demanda | |

**User's choice:** `municipio_coords`
**Notes:** Necessario para cumprir filtro por raio com maior precisao.

---

## Visibility Scope

| Option | Description | Selected |
|--------|-------------|----------|
| contractor_selects_radius | Contratante escolhe raio ao publicar demanda | ? |
| fixed_default_radius | Raio padrao fixo no sistema | |
| municipio_only_no_radius | Somente municipio no V1 (sem raio) | |

**User's choice:** `contractor_selects_radius`
**Notes:** Maior controle por contexto da demanda.

| Option | Description | Selected |
|--------|-------------|----------|
| allow_by_radius | Sim, se cair dentro do raio definido | ? |
| same_municipio_only | Sempre restrito ao mesmo municipio | |
| configurable_by_city | Depende do municipio (config admin) | |

**User's choice:** `allow_by_radius`
**Notes:** Mantem matching por proximidade real.

| Option | Description | Selected |
|--------|-------------|----------|
| demand_point_to_provider_radius | Ponto da demanda vs area/raio de atendimento do prestador | |
| municipio_match_then_radius | Primeiro municipio, depois filtro por raio | |
| radius_only | Apenas distancia/raio, sem exigir municipio | ? |

**User's choice:** `radius_only`
**Notes:** Municipio segue como metadado, mas o filtro principal e geodesico.

---

## Lifecycle Edit/Close

| Option | Description | Selected |
|--------|-------------|----------|
| open_closed_only | Aberta / Encerrada | |
| open_contact_closed | Aberta / Em contato / Encerrada | ? |
| draft_open_closed | Rascunho / Aberta / Encerrada | |

**User's choice:** `open_contact_closed`
**Notes:** Estado intermediario necessario para trilha operacional antes de conclusao.

| Option | Description | Selected |
|--------|-------------|----------|
| edit_anytime_until_closed | Pode editar enquanto nao encerrada | ? |
| edit_limited_window | So ate X horas apos publicacao | |
| immutable_core_fields | So campos nao criticos podem mudar | |

**User's choice:** Hibrido: editavel enquanto nao encerrada.
**Notes:** Usuario detalhou: campos nao criticos e janela enquanto demanda ativa.

| Option | Description | Selected |
|--------|-------------|----------|
| service_type | Tipo de servico imutavel apos publicar | |
| location_coords | Localidade imutavel apos publicar | |
| urgency | Urgencia imutavel apos publicar | |
| none | Nenhum bloqueio de campo | ? |

**User's choice:** `none`
**Notes:** Todos campos editaveis enquanto demanda ativa.

| Option | Description | Selected |
|--------|-------------|----------|
| allow_reopen | Permitir reabrir demanda encerrada | ? |
| no_reopen_new_demand | Encerrada exige nova demanda | |
| admin_only_reopen | Apenas admin reabre | |

**User's choice:** `allow_reopen`
**Notes:** Reuso da demanda reduz friccao para contratante.

---

## Validation Rules

| Option | Description | Selected |
|--------|-------------|----------|
| minmax | Descricao obrigatoria com minimo/maximo | ? |
| required_simple | Obrigatoria sem limites rigidos | |
| optional | Opcional | |

**User's choice:** `minmax`
**Notes:** Limites exatos ficam para detalhamento do plano.

| Option | Description | Selected |
|--------|-------------|----------|
| cooldown | Cooldown por usuario entre publicacoes | ? |
| daily_limit | Limite diario por usuario | |
| none_v1 | Sem regra anti-spam no V1 | |

**User's choice:** `cooldown`
**Notes:** Equilibrio entre protecao anti-spam e simplicidade.

| Option | Description | Selected |
|--------|-------------|----------|
| block_publish | Bloquear publicacao quando localizacao invalida | ? |
| fallback_municipio_only | Publicar sem raio quando invalida | |
| allow_with_warning | Permitir com aviso | |

**User's choice:** `block_publish`
**Notes:** Evita distorcer matching geografico.

---

## Claude's Discretion

- Duracao exata do cooldown anti-spam.
- Copy final das mensagens de validacao.
- Contratos de payload e enums tecnicos.

## Deferred Ideas

- Nenhuma ideia fora de escopo foi introduzida nesta discussao.
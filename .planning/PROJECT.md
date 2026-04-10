# Opus Freelas

## What This Is

Opus Freelas e uma plataforma multiplataforma de freelancing focada em servicos manuais e rurais na regiao da Associacao dos Municipios do Alto Uruguai Catarinense (AMAUC). O produto conecta contratantes locais a prestadores como capineiros, rocadores, operadores de maquinas agricolas, diaristas e autonomos em geral. No V1, o foco principal e facilitar o lado do contratante para publicar demandas e encontrar prestadores rapidamente.

## Core Value

Permitir que contratantes da AMAUC encontrem e conectem-se rapidamente a prestadores locais confiaveis para servicos manuais e rurais.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Contratante consegue publicar demanda de servico com detalhes claros (tipo, localidade, janela de atendimento e contato)
- [ ] Contratante consegue encontrar prestadores da regiao com filtros por localidade/tipo de servico
- [ ] Prestador possui perfil com localidade, raio de atendimento e provas de servico (fotos/portfolio)
- [ ] Prestador passa por verificacao basica de identidade/telefone
- [ ] Plataforma permite avaliacao apos conclusao do servico
- [ ] Fluxo de fechamento no V1 e leve: plataforma conecta as partes e fechamento ocorre fora da plataforma
- [ ] Monetizacao inicial baseada em assinatura para prestadores anunciarem/ofertarem servicos

### Out of Scope

- Contrato digital formal com validade juridica no V1 — reduz complexidade juridica e operacional inicial
- Negociacao completa in-app com assinatura/aceite juridico robusto no V1 — priorizar liquidez e velocidade de conexao
- Cobranca por taxa de intermediacao no V1 — monetizacao inicial sera assinatura de prestador

## Context

Hoje, a cadeia de trabalho manual e rural na regiao-alvo opera de forma majoritariamente informal, com descoberta de servicos por rede pessoal e canais dispersos. O produto busca formalizar digitalmente essa conexao sem elevar friccao no fechamento no inicio. O recorte geografico e intencional (AMAUC), com dinamica local forte e relevancia de proximidade para contratacao.

## Constraints

- **Geografia**: Foco inicial restrito a AMAUC — garantir aderencia ao contexto local e facilitar tracao inicial
- **Produto**: Abordagem multiplataforma — acesso por diferentes dispositivos e perfis de usuario
- **Fluxo comercial**: Fechamento fora da plataforma no V1 — priorizar simplicidade e tempo de entrega
- **Confianca**: Verificacao basica + localidade + provas de servico + avaliacoes ja no V1 — reduzir risco percebido por contratantes
- **Monetizacao**: Assinatura de prestadores no inicio — validar viabilidade economica sem depender de intermediar pagamento

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Priorizar experiencia do contratante no V1 | Lado da demanda e principal gargalo inicial para gerar liquidez local | — Pending |
| Fechamento leve no V1 (conexao + contato externo) | Reduz complexidade juridica e acelera time-to-market | — Pending |
| Confianca minima com verificacao basica, localidade, portfolio e avaliacao | Essencial para adocao em servicos locais com alto peso de reputacao | — Pending |
| Monetizacao inicial por assinatura de prestadores | Modelo simples para iniciar receita recorrente e testar disposicao de pagamento | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-09 after initialization*

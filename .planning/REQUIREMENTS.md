# Requirements: AMAUC Freelas

**Defined:** 2026-04-09
**Core Value:** Permitir que contratantes da AMAUC encontrem e conectem-se rapidamente a prestadores locais confiaveis para servicos manuais e rurais.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: Usuario pode criar conta e acessar com OTP por telefone
- [ ] **AUTH-02**: Usuario permanece autenticado entre sessoes no mesmo dispositivo
- [ ] **AUTH-03**: Sistema aplica papeis distintos de contratante e prestador com autorizacao adequada

### Demands

- [ ] **DEMD-01**: Contratante pode publicar demanda com tipo de servico, descricao, localidade e urgencia
- [ ] **DEMD-02**: Contratante pode editar e encerrar suas proprias demandas
- [ ] **DEMD-03**: Demanda respeita visibilidade por municipio e raio definidos

### Discovery

- [ ] **DISC-01**: Contratante pode buscar prestadores por tipo de servico
- [ ] **DISC-02**: Contratante pode filtrar prestadores por municipio e raio de atendimento
- [ ] **DISC-03**: Sistema exibe estados vazios claros quando nao houver oferta local compatível

### Trust

- [ ] **TRST-01**: Prestador pode concluir verificacao basica e exibir selo no perfil
- [ ] **TRST-02**: Prestador pode publicar portfolio com fotos e descricoes de servicos
- [ ] **TRST-03**: Contratante pode avaliar prestador apos conclusao do servico com regras basicas anti-abuso

### Connection & Revenue

- [ ] **CONN-01**: Plataforma permite handoff de contato para fechamento fora da plataforma (telefone/WhatsApp)
- [ ] **CONN-02**: Contratante pode registrar status basico da demanda (aberta, em contato, concluida)
- [ ] **REVN-01**: Prestador pode aderir a assinatura com beneficios de visibilidade definidos

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Contracts and Negotiation

- **CONT-01**: Usuario pode formalizar contrato digital com trilha juridica completa
- **CONT-02**: Usuario pode negociar integralmente dentro da plataforma sem depender de canal externo

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Escrow/pagamento intermediado no V1 | Nao faz parte da estrategia inicial de fechamento leve |
| Escala nacional no V1 | Prioridade e densidade local na AMAUC |
| Onboarding documental pesado no V1 | Pode reduzir liquidez inicial e aumentar friccao |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| DEMD-01 | Phase 2 | Pending |
| DEMD-02 | Phase 2 | Pending |
| DEMD-03 | Phase 2 | Pending |
| DISC-01 | Phase 3 | Pending |
| DISC-02 | Phase 3 | Pending |
| DISC-03 | Phase 3 | Pending |
| TRST-01 | Phase 4 | Pending |
| TRST-02 | Phase 4 | Pending |
| TRST-03 | Phase 5 | Pending |
| CONN-01 | Phase 5 | Pending |
| CONN-02 | Phase 5 | Pending |
| REVN-01 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 after initial definition*

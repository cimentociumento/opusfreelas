# Phase 1: Foundation & Identity - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 01-foundation-identity
**Areas discussed:** Authentication, Session, Roles, Technical Baseline

---

## Authentication

| Option | Description | Selected |
|--------|-------------|----------|
| Telefone + OTP apenas | Login local simplificado | |
| Telefone + OTP + email opcional | Login principal por telefone com apoio de email | |
| E-mail/senha | Login classico sem OTP | |
| Stack composta (Clerk + JWT + Supabase + Firebase) | Estrategia de seguranca e operacao reforcada | ✓ |

**User's choice:** Confirmou stack composta para o V1 com `Clerk + JWT + Supabase + Firebase`.
**Notes:** Recuperacao definida por e-mail de backup.

---

## Session

| Option | Description | Selected |
|--------|-------------|----------|
| Sessao longa | Ate 30 dias com refresh | |
| Sessao media | 7 dias com refresh | |
| Sessao curta/estrita | 24h e reautenticacao frequente | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-dispositivo sem controle global | Sessao em varios aparelhos | |
| Dispositivo unico | Apenas 1 sessao ativa | |
| Multi-dispositivo + logout global | Permite varios e encerrar todas sessoes | ✓ |

**User's choice:** Sessao curta/estrita com opcao de logout global.
**Notes:** Priorizacao de seguranca na fase de base.

---

## Roles

| Option | Description | Selected |
|--------|-------------|----------|
| Papel fixo | Contratante ou prestador sem troca | |
| Conta unica com dois papeis | Pode atuar em ambos papeis | ✓ |
| Papel principal + secundario | Evolucao gradual de papeis | |

| Option | Description | Selected |
|--------|-------------|----------|
| Backend estrito | Toda permissao no servidor | |
| Modelo misto | Backend principal + reforco no app | ✓ |
| Validacao leve no app | Baixa rigidez no V1 | |

**User's choice:** Conta unica com dois papeis e autorizacao mista.
**Notes:** Mantem flexibilidade de uso com controle funcional.

---

## Technical Baseline

| Option | Description | Selected |
|--------|-------------|----------|
| REST | Simples e previsivel | |
| RPC | Contratos orientados a acao | ✓ |
| GraphQL | Maior flexibilidade de consulta | |

| Option | Description | Selected |
|--------|-------------|----------|
| Staging + producao | Deploy completo na fase 1 | |
| Apenas staging | Ambiente intermediario primeiro | |
| Local + CI | Base interna primeiro, deploy depois | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Logs + erros | Observabilidade essencial | |
| Logs + erros + metricas | Nivel intermediario | |
| Full observability | Logs, erros, metricas e tracing | ✓ |

**User's choice:** RPC, entrega local+CI e observabilidade completa.
**Notes:** Deploy publico fica para fase posterior.

---

## Claude's Discretion

- Estrutura interna de modulos de identidade.
- Escolha de ferramentas especificas de observabilidade/tracing.
- Organizacao tecnica de claims/permissoes JWT.

## Deferred Ideas

None.

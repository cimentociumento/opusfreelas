<!-- GSD:project-start source:PROJECT.md -->
## Project

**AMAUC Freelas**

AMAUC Freelas e uma plataforma multiplataforma de freelancing focada em servicos manuais e rurais na regiao da Associacao dos Municipios do Alto Uruguai Catarinense (AMAUC). O produto conecta contratantes locais a prestadores como capineiros, rocadores, operadores de maquinas agricolas, diaristas e autonomos em geral. No V1, o foco principal e facilitar o lado do contratante para publicar demandas e encontrar prestadores rapidamente.

**Core Value:** Permitir que contratantes da AMAUC encontrem e conectem-se rapidamente a prestadores locais confiaveis para servicos manuais e rurais.

### Constraints

- **Geografia**: Foco inicial restrito a AMAUC — garantir aderencia ao contexto local e facilitar tracao inicial
- **Produto**: Abordagem multiplataforma — acesso por diferentes dispositivos e perfis de usuario
- **Fluxo comercial**: Fechamento fora da plataforma no V1 — priorizar simplicidade e tempo de entrega
- **Confianca**: Verificacao basica + localidade + provas de servico + avaliacoes ja no V1 — reduzir risco percebido por contratantes
- **Monetizacao**: Assinatura de prestadores no inicio — validar viabilidade economica sem depender de intermediar pagamento
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core client (multiplataforma)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Expo SDK** | **55.x** (`expo@~55.0.0`) | App iOS/Android (e alvo web se necessário) | Padrão 2026 da documentação oficial do Expo: RN **0.83**, React **19.2**, alinhamento com requisitos de loja (Android API 36, iOS 15.1+). Um só codebase para “multiplataforma” do PROJECT.md. |
| **React Native** | **0.83.x** (via Expo) | UI nativa | Emparelhado ao SDK 55; New Architecture como linha principal do ecossistema. |
| **React** | **19.2.x** (via Expo) | Modelo de UI | Versão suportada pelo SDK 55. |
| **expo-router** | compatível com SDK 55 | Navegação file-based / deep links | Fluxo de demanda → prestador → contato externo beneficia de rotas previsíveis e deep linking (compartilhar vaga). |
| **@tanstack/react-query** | **5.x** | Cache e sincronização servidor/cliente | Padrão de mercado; otimista para listagens e perfis; reduz re-fetch em 3G/intermitente comum em área rural. |
| **Zod** | **3.x** | Validação compartilhada | Mesmos contratos que o backend (ver API). |
| **i18next** + **expo-localization** | estáveis | pt-BR primeiro | Produto regional; evita hardcode de strings. |
### API e domínio (backend)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Node.js** | **22.x LTS** (runtime do serviço API) | Execução do servidor | LTS maduro para webhooks, filas e I/O; separar do requisito mínimo do Expo (ferramenta de build no dev pode ser 20.19+). |
| **Hono** | **4.x** | Framework HTTP | Leve, TypeScript-first, ótimo para rotas REST + OpenAPI; cold start aceitável em PaaS; equipe alinha com stack JS do app. |
| **Drizzle ORM** | **0.x** (pin na lockfile) | Acesso a dados | SQL explícito e tipagem forte — importante para **PostGIS** (consultas `GEOGRAPHY`, `ST_DWithin`, índices GiST) sem “lutar” contra abstrações. |
| **Zod** | **3.x** | Validação de entrada/saída | Consistente com o app. |
| **PostgreSQL** | **17.x** | Banco relacional | Padrão para marketplace: transações, integridade, extensões. |
| **PostGIS** | **3.5+** (pin conforme imagem do provedor: RDS, Neon, Supabase, etc.) | Raio, município, distância | Requisito implícito de “filtros por localidade/tipo” e raio de atendimento; `ST_DWithin` + `GEOGRAPHY(POINT, 4326)` + índice espacial. |
| **Redis** | **7.x** | Fila, rate limit, cache curto | BullMQ precisa de broker; rate limit em OTP e publicação. |
| **BullMQ** | **5.x** | Jobs assíncronos | E-mails, reprocessamento de webhooks, tarefas de moderação leve. |
### Pagamentos e assinatura (prestador)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Mercado Pago — Subscriptions** | API atual (documentação “Subscriptions”) | Assinatura em BRL | Forte aderência a hábitos locais (Pix, cartões domésticos, parcelamento). Para marketplace **sem** intermediar pagamento entre partes no V1, o foco é **cobrar o prestador** — encaixa como SaaS. |
| **Pagar.me (Stone)** | API atual | Alternativa PSP BR | Recorrência e Pix/boleto no ecossistema brasileiro; útil se MP não atender taxa/contrato. |
### Mídia e infraestrutura
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Armazenamento objeto** | S3-compatível (**R2**, **S3**, **Supabase Storage**) | Fotos de portfólio | Presigned PUT/GET, CDN; não guardar binários no Postgres. |
| **Hospedagem API + worker** | **Fly.io**, **Railway**, **Render** (ou cloud BR se requisito de dados) | API + processos BullMQ | Padrão 2026 para times pequenos; Postgres gerenciado na mesma região (idealmente **South America**). |
| **Build mobile** | **EAS Build / Submit** | Binários loja | Fluxo natural com Expo; perfis dev/preview/prod. |
| **Observabilidade** | OpenTelemetry + provedor (ex.: Grafana Cloud, Honeycomb, ou Axiom) | Trás em produção | Essencial antes de escalar tráfego rural heterogêneo. |
### Qualidade e DX
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **pnpm** | 9.x+ | Monorepo/pacotes | Workspaces para `apps/mobile`, `apps/api`, `packages/shared`. |
| **Turborepo** | 2.x | Cache de build | CI mais rápido. |
| **Vitest** | 2.x | Testes unitários API | Rápido em TS. |
| **Playwright** ou **Maestro** | estável | E2E críticos | Fluxos: publicar demanda, buscar por município, contactar. |
| **Biome** ou **ESLint + Prettier** | estável | Lint/format | Uma política por monorepo. |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Mobile | Expo SDK 55 | Flutter | Flutter é viável, mas duplica linguagem em relação ao backend TS e aumenta custo de hiring/integração para time JS-focused. |
| API framework | Hono 4 | NestJS 11 | Nest brilha em enterprise modular; para V1 regional, Hono reduz superfície e mantém performance previsível. Se o time já for Nest-heavy, Nest é aceitável — não é “errado”. |
| ORM | Drizzle | Prisma | Prisma é maduro; para PostGIS, Drizzle tende a exigir menos “contorno” e menos binário em deploy. |
| BaaS rápido | Custom API + Postgres | Supabase completo | Supabase acelera MVP, mas acopla auth, políticas RLS e billing custom — para assinatura BR e regras de marketplace, avaliar lock-in vs velocidade. |
| DB | PostgreSQL + PostGIS | MongoDB | Marketplace + geo relacional + avaliações puxam modelo relacional; evitar Mongo como fonte primária. |
| Pagamentos BR | Mercado Pago / Pagar.me primeiro | Apenas Stripe | Risco de gap em recorrência Pix/conta BR conforme produto habilitado na Stripe. |
## Installation (monorepo — esqueleto)
# Pacote raiz
# App Expo (usar template alinhado ao SDK em vigor na data do clone)
# API (exemplo)
# No Postgres (produção/migrate)
# CREATE EXTENSION IF NOT EXISTS postgis;
## Confidence
| Área | Nível | Notas |
|------|--------|--------|
| Expo / RN / React (SDK 55) | **HIGH** | Tabela oficial Expo ↔ versões RN/React/Node mínimo e requisitos Android/iOS. Fonte: [Expo SDK reference](https://docs.expo.dev/versions/latest/). |
| PostGIS / modelo geo | **HIGH** | Padrão de indústria para raio; funções e indexação bem documentadas pelo projeto PostGIS. |
| Backend TS (Hono + Drizzle) | **MEDIUM** | Escolha opinativa baseada em práticas atuais de 2025–2026; não substitui prova no seu monorepo e SLOs. |
| Pagamentos assinatura BR | **MEDIUM** | Há incerteza regulatória/contratual por conta; documentação Stripe sobre Pix/BR e limites de Automático deve ser validada caso a caso. Fonte: [Stripe Pix](https://docs.stripe.com/payments/pix). |
| SMS/OTP Brasil | **MEDIUM–HIGH** | Twilio publica guidelines BR; operação real exige testes em MNOs e LGPD. |
## Sources
- [Expo SDK reference — version matrix (SDK 55 / RN 0.83 / React 19.2)](https://docs.expo.dev/versions/latest/)
- [PostGIS — radius / distance FAQ](https://postgis.net/documentation/faq/radius-search/)
- [Stripe Docs — Pix (Brasil, recorrência, restrições)](https://docs.stripe.com/payments/pix)
- [Mercado Pago Developers — Subscriptions overview](https://www.mercadopago.com.br/developers/en/docs/subscriptions/overview)
- [Twilio — SMS Guidelines Brazil](https://www.twilio.com/en-us/guidelines/br/sms)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

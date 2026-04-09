# Technology Stack

**Project:** AMAUC Freelas  
**Domain:** Marketplace regional de serviços manuais e rurais (AMAUC/SC, Brasil)  
**Researched:** 2026-04-09  
**Overall confidence:** **MEDIUM–HIGH** (versões mobile/geo verificadas em documentação oficial; pagamentos BR exigem validação com PSP e contador jurídico no V1)

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

**Pacotes Expo típicos para o domínio:** `expo-image-picker` / `expo-camera` (portfólio), `expo-location` (permissão/coleta auxiliar — não substitui endereço confirmado no backend), `expo-notifications` (lembretes), `expo-secure-store` (tokens).

**Listas:** `@shopify/flash-list` para feeds de prestadores/demandas.

**Mapas:** `react-native-maps` com provedor Google Maps Platform (endereços e mental model brasileiro são fortemente Google-centric).

**Node mínimo para toolchain Expo (SDK 55):** **20.19.x** (requisito documentado do Expo); em CI/desenvolvimento, usar essa linha ou superior conforme matriz do Expo.

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

**Auth (V1 alinhado ao PROJECT.py):** fluxo **telefone + OTP** com **Twilio Verify** (ou equivalente com documentação BR clara), sessões **JWT** de curta duração + refresh rotativo armazenado em tabela; segredo em **expo-secure-store** no app. Seguir diretrizes de SMS para Brasil (operadoras, encoding) conforme documentação Twilio para BR.

**Documentação de API:** gerar OpenAPI (ex.: `@hono/zod-openapi`) para o roadmap e testes.

### Pagamentos e assinatura (prestador)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Mercado Pago — Subscriptions** | API atual (documentação “Subscriptions”) | Assinatura em BRL | Forte aderência a hábitos locais (Pix, cartões domésticos, parcelamento). Para marketplace **sem** intermediar pagamento entre partes no V1, o foco é **cobrar o prestador** — encaixa como SaaS. |
| **Pagar.me (Stone)** | API atual | Alternativa PSP BR | Recorrência e Pix/boleto no ecossistema brasileiro; útil se MP não atender taxa/contrato. |

**Stripe (papel secundário):** suporta **Pix** e documenta **Pix Automático** para recorrência em fluxos Stripe/Ebanx, mas a própria documentação indica restrições para contas **BR** em recorrência via Automático (“invite only” / indisponível conforme região). **Não** assumir Stripe como único provedor até validar conta, produto e cenário BRL com o time financeiro — evita retrabalho no V1.

**O que NÃO fazer aqui:** depender só de cartão internacional; ignorar **LGPD** e clareza de preço (IOF e métodos internacionais podem afetar percepção).

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

```bash
# Pacote raiz
corepack enable
pnpm init

# App Expo (usar template alinhado ao SDK em vigor na data do clone)
pnpm dlx create-expo-app@latest apps/mobile

# API (exemplo)
mkdir -p apps/api && cd apps/api
pnpm init
pnpm add hono @hono/node-server drizzle-orm postgres zod
pnpm add -D drizzle-kit typescript @types/node tsx vitest

# No Postgres (produção/migrate)
# CREATE EXTENSION IF NOT EXISTS postgis;
```

**Versões exatas:** fixar `pnpm-lock.yaml` e imagens Docker do Postgres/Redis no primeiro sprint; alinhar PostGIS à matriz da hospedagem escolhida.

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

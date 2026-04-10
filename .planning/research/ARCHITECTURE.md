# Architecture Patterns

**Domain:** Marketplace regional de serviços manuais e rurais (AMAUC)  
**Researched:** 2026-04-09  
**Overall confidence:** MEDIUM–HIGH (padrões amplamente adotados; detalhes de verificação/pagamento variam por provedor e LGPD exigem revisão jurídica em fase própria)

## Executive framing

Para **confiabilidade**, **baixa sobrecarga operacional** e **escala futura**, a arquitetura recomendada é um **núcleo transacional coeso (modular monolith ou “modulith”)** com **fronteiras lógicas claras**, hospedado em **serviços gerenciados** (BD, filas, object storage, observabilidade). Microserviços completos no V1 elevam custo operacional sem ganho proporcional para um time pequeno e um recorte geográfico inicial. A evolução esperada é **extrair serviços só quando um módulo virar gargalo** (ex.: verificação de identidade, faturamento) — padrão conhecido como *strangler* / desacoplamento incremental.

O produto Opus Freelas é **two-sided** com **fechamento fora da plataforma no V1** e **monetização por assinatura do prestador**: o backend não precisa mediar pagamento de serviço, mas precisa mediar **identidade**, **catálogo de demandas/ofertas**, **confiança** (verificação, avaliações) e **cobrança recorrente** de assinatura.

## Recommended architecture

### Visão em camadas (alto nível)

```text
[Clientes: Web / Mobile]
        |
        v
[API + BFF opcional]  -----> [Auth / sessão / políticas]
        |
        +--> [Domínio marketplace: demandas, perfis, busca, reviews]
        |
        +--> [Confiança: verificação, moderação leve]
        |
        +--> [Monetização: assinaturas, webhooks, entitlement]
        |
        +--> [Comunicações: notificações transacionais]
        |
        v
[Dados: PostgreSQL (+ PostGIS se busca geo avançada)] + [Object storage: mídia]
[Fila/jobs: tarefas assíncronas] + [Cache opcional]
[Observabilidade: logs, métricas, tracing]
```

**Por que assim:** uma única unidade deployável (ou poucos serviços) simplifica deploy, migrações e debug, enquanto **módulos internos** (pacotes ou bounded contexts) evitam que “tudo fale com tudo” e preparam extração futura.

### Component boundaries

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| **Cliente (Web/Mobile)** | UI, formulários, mapas leves, estados offline-degradados quando aplicável | API (HTTPS), armazenamento local de sessão |
| **API / application core** | Orquestração de casos de uso, validação, autorização por papel (contratante vs prestador) | DB, fila, storage, provedores externos via adaptadores |
| **Identity & access** | Cadastro/login, sessões/JWT, vínculo telefone, papéis | Provedor de auth (ou módulo interno), SMS/WhatsApp para OTP |
| **Marketplace core** | Demandas, perfis de prestador, categorias de serviço, raio/município, portfolio (metadados) | DB, object storage (URLs), busca |
| **Discovery / search** | Listagens filtradas por localidade/tipo; eventual ranking simples | DB (índices, opcional PostGIS), cache de leitura se necessário |
| **Trust & verification** | Estado de verificação, regras de “basico OK”, auditoria mínima | Filas assíncronas, API de provedor KYC/telefone (adapter) |
| **Reputation** | Avaliações pós-serviço, agregados, anti-abuso básico | DB; regras para evitar review bombing |
| **Billing / subscriptions** | Planos prestador, estado de assinatura, webhooks, idempotência | Gateway de pagamento (adapter), DB |
| **Notifications** | Envio de e-mail/SMS/push/WhatsApp (conforme estratégia) | Provedores terceiros; fila para retries |
| **Media** | Upload seguro, varredura básica, URLs assinadas ou públicas controladas | Object storage gerenciado |
| **Observability** | Logs estruturados, métricas, alertas | Plataforma gerenciada |

Módulos **não** devem compartilhar tabelas “por conveniência” sem contrato; preferir APIs internas claras mesmo dentro do monolith para facilitar extração futura.

### Data flow

**1) Publicar demanda (contratante)**  
Cliente → API (authN + authZ) → validação de escopo AMAUC (município, categoria) → persistência de `demand` + localidade → (opcional) evento interno “demanda criada” → notificação a prestadores elegíveis (fila) → resposta ao cliente.

**2) Descobrir prestadores**  
Cliente → API → consulta indexada por `service_type`, `municipality` e/ou **PostGIS** (`ST_DWithin` em raio) → retorno de lista + sinalizadores de verificação/assinatura ativa → sem necessidade de expor PII além do necessário na listagem.

**3) Perfil e portfolio**  
Prestador → upload via URL pré-assinada → object storage; metadados e vínculo no DB → leitura pública via URLs estáveis ou proxy controlado.

**4) Verificação básica**  
API inicia fluxo → fila processa callbacks do provedor → atualização de estado em `provider_verification` → notificação ao prestador; falhas com retry e DLQ (dead-letter) para inspeção manual pontual.

**5) Avaliação após serviço**  
Contratante autenticado → API verifica vínculo mínimo com demanda/conexão registrada (regra de produto) → grava review → atualização de agregado (transacional ou job).

**6) Assinatura prestador**  
Checkout ou portal SDK → webhook idempotente → entitlement em DB (`can_bid`, `profile_boost`, etc.) → UI reflete estado; falha de webhook não deve duplicar efeitos (chaves idempotentes).

Fluxo transversal: **todas** as escritas críticas passam por transações claras; leituras de listagem podem tolerar replica read-only mais tarde.

### Patterns to follow

#### Pattern 1: Outbox / fila para efeitos colaterais
**What:** Persistir evento de domínio ou registro *outbox* na mesma transação da entidade; worker envia notificações.  
**When:** Notificações, indexação secundária, integrações externas.  
**Why:** Evita “demanda criada mas SMS nunca disparou” sem rastreio; melhora confiabilidade sob falha de rede.

#### Pattern 2: Anti-corrupção em integrações
**What:** Camada adapter para SMS, pagamentos, KYC; não espalhar payloads de terceiros pelo domínio.  
**When:** Sempre que houver webhook ou SDK externo.  
**Why:** Troca de provedor sem reescrever regras de negócio.

#### Pattern 3: Geo com modelo explícito
**What:** Começar com **município + raio** bem definidos; introduzir **PostGIS** quando filtros espaciais ou densidade de dados exigirem (documentação oficial PostGIS para `GEOGRAPHY`, GiST, `ST_DWithin`).  
**When:** V1 pode ser apenas colunas e índices compostos se o modelo de dados for simples; evoluir para PostGIS antes de hacks de performance.

#### Pattern 4: Multiplataforma com contrato de API único
**What:** Uma API versionada; clientes Web/Mobile compartilham modelo de domínio.  
**When:** Requisito explícito de multiplataforma no projeto.  
**Why:** Reduz drift e duplicação de regras.

### Anti-patterns to avoid

#### Anti-pattern 1: Microserviços “por slide” no V1
**What:** Decomposição prematura em muitos deploys.  
**Why bad:** Operação (observability, deploy, contratos, falhas parciais) domina o tempo do time.  
**Instead:** Monolith modular bem fatiado; métricas por módulo para decidir extração.

#### Anti-pattern 2: Lógica de confiança espalhada na UI
**What:** Decidir “pode publicar” só no cliente.  
**Why bad:** Bypass trivial; inconsistência entre Web e Mobile.  
**Instead:** Autorização e invariantes no servidor.

#### Anti-pattern 3: Depender de chat in-app como sistema de verdade no V1
**What:** Negociação rica in-app quando o produto define fechamento fora.  
**Why bad:** Complexidade de moderação, custo, expectativa legal maior.  
**Instead:** Mensageria mínima ou só “reveal contact” auditável; escopo explícito out-of-app.

### Scalability considerations (AMAUC → além)

| Concern | Early AMAUC (baixa escala) | Crescimento regional | Escala maior / multi-região |
|--------|----------------------------|----------------------|-----------------------------|
| Leitura de listagens | Índices no Postgres, paginação | Read replicas, cache de listas quentes | Particionamento por região/tempo; CDN para assets |
| Busca geo | Colunas + índices ou PostGIS leve | PostGIS + tuning GiST | Segmentação de dados; possível serviço de busca dedicado |
| Uploads de mídia | Storage gerenciado + limite de tamanho | CDN, jobs de thumbnails | Varredura antimalware, pipelines assíncronos |
| Verificação / webhooks | Fila única com retries | Escalar workers; isolar fila de billing | Serviço dedicado com SLAs distintos |
| Equipe / deploy | Um pipeline, um ambiente prod austero | Staging obrigatório; feature flags | Extrair billing ou verification como serviço |

### Reliability & low operational overhead (checklist de decisão)

- **Infra gerenciada:** BD gerenciado, backups automáticos, patches; object storage e fila gerenciados reduzem “snowflake servers”.
- **Idempotência:** Webhooks de assinatura e verificação com chaves idempotentes armazenadas.
- **Observabilidade desde o primeiro deploy:** logs correlacionados (request id), alertas em taxa de erro e latência de fila — barato em serviços gerenciados, caro remediar sem isso.
- **Segurança pragmatic:** TLS obrigatório, segredos em vault do provedor, princípio do menor privilégio em IAM de storage.
- **LGPD (não substitui counsel):** bases legais e retenção mínima para telefone, documentos de verificação e logs — tratar **dados sensíveis** em módulo com política clara e auditoria; validar com assessoria na fase adequada (**confidence: policy details = fase legal**).

## Suggested build order (implicações de roadmap)

Ordem alinhada a **priorizar contratante no V1**, **liquidez local** e **confiança mínima**, com entregas incrementais deployáveis.

1. **Fundação: identidade, papéis, API saudável**  
   Cadastro/login, contratante vs prestador, sessões seguras, isolamento de dados por usuário.  
   *Desbloqueia todo o resto.*

2. **Demanda: publicação e ciclo de vida básico de demandas**  
   CRUD de demanda com localidade AMAUC, tipos de serviço, janela e contato (conforme produto).  
   *Valida lado demanda primeiro.*

3. **Descoberta: listagem e filtros**  
   Busca por município/tipo (e raio quando existir modelo espacial); paginação; índices corretos.  
   *Fecha o loop “publicar → achar prestadores” do ponto de vista do contratante.*

4. **Oferta: perfil de prestador + portfolio**  
   Perfil, raio, mídias via storage.  
   *Sem isso, a descoberta é vazia.*

5. **Confiança: verificação básica (assíncrona)**  
   Fluxo telefone/documento via fila + estados explícitos; sem bloquear leitura de perfil de forma inconsistente.  
   *Reduz risco percebido sem travar MVP.*

6. **Reputação: avaliações**  
   Regras anti-fraude simples, agregados.  
   *Reforça confiança após haver transações registradas na plataforma.*

7. **Monetização: assinatura prestador**  
   Entitlement no DB, webhooks, UX de “sem assinatura / com assinatura”.  
   *Último entre core marketplace para não frição liquidez antes de haver valor percebido.*

8. **Polimento multiplataforma e observabilidade**  
   Paridade Web/Mobile nos fluxos críticos, métricas de conversão por etapa, hardening.

**Dependências explícitas:** (3) depende de (2) e dados de prestador; (4) antes de uma descoberta rica; (5) pode rodar em paralelo com (4) mas exige (1); (6) exige modelo mínimo de “serviço concluído ou conexão válida”; (7) exige (4) e política de o que assinatura desbloqueia.

## Gaps e flags para fases futuras

- **Provedores concretos** (SMS, pagamento, KYC): escolha afeta SLAs e layout de dados — pesquisa de stack em `STACK.md` deve cravar adapters.  
- **Moderation / disputas:** fora do escopo rígido do V1; arquitetura deve permitir fila de “reports” sem reescrever núcleo.  
- **Offline/low connectivity:** comum em áreas rurais — avaliar UX e caching no cliente em fase de produto, não só backend.

## Sources

| Fonte | Uso | Confiança |
|--------|-----|-----------|
| [PostGIS — Geography / indexing](https://postgis.net/workshops/postgis-intro/geography.html) | Modelagem geo e consultas por proximidade | HIGH (oficial) |
| [PostGIS.net](https://postgis.net/) | Extensão e capacidades | HIGH (oficial) |
| Discussões ecosystem 2026 sobre monolith-first para MVP e *strangler* para evolução | Direção estrutural two-sided marketplace | MEDIUM (consenso de indústria; alguns artigos não são primários) |
| `.planning/PROJECT.md` | Escopo V1 AMAUC, fechamento fora da plataforma, assinatura prestador | HIGH (requisitos do projeto) |

---

*Este documento cobre a dimensão de arquitetura; decisões de stack concreto (hosting, frameworks) pertencem a `STACK.md` e devem permanecer alinhadas a estas fronteiras.*

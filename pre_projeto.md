## Resumo

O presente pré-projeto descreve o planejamento e o desenvolvimento da plataforma **Opus Freelas**, voltada à oferta e contratação de serviços manuais e rurais na região da Associação dos Municípios do Alto Uruguai Catarinense (AMAUC). A solução conecta prestadores, como capineiros, roçadores, operadores de máquinas agrícolas, diaristas e autônomos em geral, ligando a contratantes locais, reduzindo a informalidade da descoberta de serviços e aumentando confiança por meio de perfil, localidade, verificação básica e reputação.

O escopo da primeira versão, definido de forma explícita no planejamento do produto, **prioriza o contratante** (publicação e descoberta de demanda) e adota **fechamento do serviço fora da plataforma** (Telefone/WhatsApp), sem intermediação financeira entre as partes nessa etapa. A monetização inicial prevista é **assinatura do prestador** (modelo SaaS), com integração ao ecossistema brasileiro via **Mercado Pago**. A arquitetura combina aplicação **multiplataforma** com **Expo** (React Native, SDK alinhado à documentação 2026), API em **Node.js** com **Hono**, dados em **PostgreSQL** com **PostGIS** (infraestrutura gerenciada via **Supabase**), autenticação com **Clerk** (fluxo por telefone com OTP, papéis de contratante e prestador na mesma conta) e observabilidade com padrões modernos (logs, métricas, tracing).

O desenvolvimento segue metodologia de entregas iterativas com apoio de ferramentas de IA e gestão de trabalho estruturada pelo fluxo **GSD** (Get Shit Done), com repositório versionado, artefatos de requisitos, roadmap em fases e rastreabilidade entre escopo e implementação.

## 1 Introdução

O avanço das tecnologias digitais impulsionou o surgimento da chamada *economia de plataformas*, modelo no qual intermediários digitais conectam ofertantes e demandantes de serviços de forma eficiente e transparente, eliminando barreiras geográficas e reduzindo custos de transação (Workana, 2024; GetNinjas, 2024). Plataformas como Workana, 99Freelas, GetNinjas e Uber consolidaram esse modelo em centros urbanos e no mercado de serviços digitais.

Contudo, o meio rural permanece amplamente excluído desse fenômeno. Na região da AMAUC, que concentra forte vocação para a agricultura familiar, criação de suínos e aves e o cultivo de soja e milho, a contratação de serviços como capina, roçada, operação de máquinas, plantio, colheita, cercamento e limpeza de terrenos ainda ocorre de forma inteiramente informal: por indicação boca a boca, sem contrato, sem garantia de pagamento e sem histórico de reputação para nenhuma das partes (IBGE – Instituto Brasileiro de Geografia e Estatística, 2019; SEBRAE – Serviço Brasileiro de Apoio às Micro e Pequenas Empresas, 2022).

Essa lacuna representa simultaneamente um problema socioeconômico e uma oportunidade concreta de aplicação tecnológica. A plataforma *Opus Freelas* propõe uma solução multiplataforma, com prioridade para dispositivos móveis e, quando aplicável, alvo web, assim formalizando digitalmente essas relações de trabalho, oferecendo aos prestadores visibilidade e renda consistente, e aos contratantes rapidez, segurança e rastreabilidade na contratação. O projeto é desenvolvido como projeto integrador do Curso Técnico Integrado em Informática para Internet do IFC Campus Concórdia.

---

## 2 Objetivos

### 2.1 Objetivo Geral

Projetar, desenvolver e entregar a plataforma **Opus Freelas**: solução multiplataforma para contratação de serviços manuais e rurais na AMAUC, com **foco inicial** no contratante, autenticação e perfis consistentes, descoberta por localidade e tipo de serviço, mecanismos de confiança (verificação, portfólio, avaliações) e fechamento do negócio fora da plataforma na primeira versão, conforme decisões de produto documentadas no planejamento (GSD).

### 2.2 Objetivos Específicos

- Formalizar requisitos funcionais e não funcionais com identificadores rastreáveis, priorização de MVP e registro explícito do que permanece fora do escopo da primeira versão (ex.: contratos digitais formais, intermediação financeira entre as partes);
- Modelar e implementar o domínio em PostgreSQL com PostGIS quando necessário para raio e município, com políticas de Row Level Security (RLS) alinhadas ao modelo de identidade (integração Clerk + Supabase);
- Implementar o cliente multiplataforma com Expo (React Native), navegação previsível (ex.: expo-router), cache de dados (TanStack Query) e validação compartilhada (Zod);
- Implementar API em Node.js com Hono, rotas em estilo RPC para identidade e regras de negócio, validação na borda e testes automatizados na API (Vitest);
- Configurar autenticação com Clerk (Telefone com OTP, sessão conforme política definida, recuperação com apoio de e-mail de backup), com autorização por papéis de contratante e prestador na mesma conta quando aplicável;
- Integrar Mercado Pago para assinatura do prestador (visibilidade e benefícios), sem depender de intermediação de pagamento entre contratante e prestador no V1;
- Estabelecer observabilidade (registros estruturados, erros, métricas e tracing) e integração futura com serviços de suporte (ex.: Firebase para notificações), sem duplicar diretório de usuários;
- Estruturar o fluxo de desenvolvimento com Git/GitHub, integração contínua em ambiente local e gestão de fases conforme metodologia GSD;
- Utilizar ferramentas de IA como copiloto de desenvolvimento e pesquisa, com revisão humana obrigatória;
- Validar a solução com testes automatizados onde aplicável e verificações manuais ou instrumentadas para fluxos que dependem de SMS, dispositivos reais e políticas de loja.

---

## 3 Justificativa

O projeto **Opus Freelas** justifica-se pela confluência de três fatores: lacuna de mercado real, alinhamento educacional e escolha tecnológica estratégica.

**Lacuna de mercado.** A AMAUC é composta por municípios predominantemente rurais onde a contratação de serviços manuais ocorre sem suporte tecnológico ou garantias legais. Dados do IBGE apontam elevado índice de trabalhadores autônomos informais no setor agrícola do oeste catarinense (IBGE, 2019), e o SEBRAE indica que a digitalização de serviços é o principal vetor de inclusão produtiva nesse perfil de região (SEBRAE, 2022). Uma plataforma que centralize oferta, demanda e sinais de confiança (localidade, verificação, reputação) contribui para reduzir assimetria de informação e informalidade na descoberta do serviço, aumentando a renda dos prestadores e reduzindo o risco percebido pelos contratantes — mesmo quando o pagamento entre as partes permanece fora da plataforma na primeira versão, como decisão explícita de produto.

**Alinhamento educacional.** O projeto integra, em uma única aplicação funcional, as competências centrais do Curso Técnico Integrado em Informática para Internet: desenvolvimento mobile multiplataforma (React Native via Expo), API e domínio em TypeScript (Node.js, Hono), banco de dados relacional e geoespacial (PostgreSQL, PostGIS), design de interfaces (Figma), versionamento (Git/GitHub) e segurança da informação (RLS, JWT via Clerk, LGPD) (SOMMERVILLE, 2019; PRESSMAN; MAXIM, 2016).

**Escolha tecnológica.** A stack definida no planejamento — cliente Expo (ecossistema React Native), API Hono em Node.js, PostgreSQL com PostGIS (via Supabase gerenciado), autenticação Clerk, integração Mercado Pago para assinatura e observabilidade moderna — alinha produtividade de equipe enxuta, tipagem em TypeScript e caminhos oficiais documentados para 2026, reduzindo retrabalho e ambiguidade entre protótipo e produção.

---

## 4 Escopo do Sistema

### 4.1 Perfis de Usuário

A plataforma opera com dois papéis — **contratante** e **prestador** — que podem coexistir na **mesma conta**, com autorização explícita por papel nas operações sensíveis (evitando vazamento de permissões apenas na interface).

- **Contratante:** perfil priorizado no MVP; publica demandas, busca prestadores por tipo de serviço e localidade, registra status da demanda e avalia após conclusão; o fechamento comercial ocorre preferencialmente fora da plataforma (contato direto).
- **Prestador de serviço:** mantém perfil com localidade, raio de atendimento, portfólio e verificação básica; pode aderir a plano de assinatura para maior visibilidade; responde a demandas e acumula reputação.

### 4.2 Módulos do Sistema

**Tabela 1: Módulos do sistema e prioridade de entrega**

| Módulo                    | Prioridade   | Descrição resumida |
|---------------------------|--------------|--------------------|
| Identidade e acesso       | MVP          | Clerk (OTP telefone), sessão, papéis contratante/prestador, API Hono + RLS |
| Demandas                  | MVP          | Publicação, edição e encerramento; visibilidade por município/raio |
| Descoberta                | MVP          | Busca e filtros por serviço e localidade; estados vazios claros |
| Confiança (prestador)     | MVP          | Verificação básica, portfólio com mídia |
| Conexão e reputação       | MVP          | Handoff de contato (telefone/WhatsApp), status da demanda, avaliações |
| Assinatura (prestador)    | MVP          | Mercado Pago — recorrência/assinatura; regras de visibilidade |
| Geolocalização            | MVP          | Consultas por município e raio (PostGIS); mapas conforme integração escolhida |
| Notificações Push         | MVP/Futuro   | Firebase (FCM) como canal de suporte; evolução conforme necessidade |
| Pagamento entre partes    | Fora do V1   | Intermediação financeira e escrow — explicitamente excluídos na v1 |
| Chat in-app completo      | Futuro       | Mensageria rica pode ser adicionada após liquidez e fechamento off-platform |
| Painel administrativo     | Futuro       | Moderação avançada, disputas formais, relatórios |

### 4.3 Categorias de Serviço (MVP)

- **Serviços Rurais:** capina, roçada, carpição, limpeza de pastos, coroamento de plantas;
- **Serviços com Máquinas:** trator, roçadeira mecânica, retroescavadeira, caminhão basculante;
- **Construção e Reforma:** pedreiro, pintor, servente, assentamento de tijolos;
- **Serviços Agrícolas:** plantio, colheita, adubação, irrigação;
- **Limpeza e Conservação:** limpeza de terrenos, poda de árvores, remoção de entulho;
- **Serviços Gerais:** carregamento, mudanças, jardinagem.

---

## 5 Stack Tecnológica

### 5.1 Visão Geral da Arquitetura

A arquitetura adota monorepo (pnpm + Turborepo), com cliente multiplataforma em Expo (React Native), uma API própria em Node.js com Hono para regras de negócio e validação na borda, e PostgreSQL com PostGIS hospedado via Supabase (migrações, RLS, Storage). A identidade fica centralizada no Clerk (JWT, OTP por telefone); o app e a API validam tokens e aplicam autorização por papéis.

**Tabela 2: Stack tecnológica — Opus Freelas (2026)**

| Camada                    | Tecnologia                          | Bibliotecas / Ferramentas |
|---------------------------|-------------------------------------|---------------------------|
| Cliente (mobile / web)    | Expo SDK 55 / React Native 0.83     | expo-router, TanStack Query, Zod, i18next |
| API e domínio             | Node.js 22 LTS + Hono 4             | Drizzle ORM, Vitest, Zod |
| Dados                     | PostgreSQL 17 + PostGIS (Supabase)  | Migrações SQL, RLS, índices espaciais |
| Identidade                | Clerk                               | OTP telefone, JWT, @clerk/clerk-expo |
| Pagamentos (V1)           | Mercado Pago                        | Assinatura/recorrência do prestador (SaaS) |
| Mídia                     | Supabase Storage                    | URLs assinadas; buckets com políticas |
| Geolocalização            | PostGIS + mapas                     | Consultas por município/raio |
| Notificações              | Firebase (FCM)                      | Canal de suporte |
| Observabilidade / CI      | GitHub Actions, Pino, OpenTelemetry | Logs, rastreio de requisições |
| Versionamento             | Git + GitHub                        | Conventional Commits, PRs |

### 5.2 Cliente multiplataforma — Expo (React Native)

O Expo concentra o cliente em React Native com SDK alinhado à matriz oficial de 2026. Navegação com expo-router, cache com TanStack Query e validação com Zod.

### 5.3 API e domínio — Hono, Drizzle e testes

Camada HTTP com Hono + Node.js 22. Drizzle ORM, validação Zod e testes com Vitest.

### 5.4 Dados e plataforma — Supabase

PostgreSQL gerenciado com PostGIS, RLS e Storage.

### 5.5 Identidade — Clerk

Autenticação por telefone com OTP. Papéis de contratante e prestador na mesma conta.

### 5.6 Banco de Dados — PostgreSQL com RLS

**Tabela 3: Modelo de dados (principais entidades V1)**

| Tabela                | Descrição                                      | Colunas-chave |
|-----------------------|------------------------------------------------|---------------|
| profiles              | Perfil de usuário vinculado ao Clerk           | id, clerk_user_id, papéis, nome, município, foto_url |
| demands               | Demandas publicadas pelo contratante           | id, autor_id, tipo_serviço, descrição, status, geom |
| provider_profile      | Dados específicos do prestador                 | user_id, raio_km, categorias[], verificado_em |
| reviews               | Avaliações                                     | id, demand_id, avaliador_id, avaliado_id, nota, comentario |
| subscription_events   | Eventos de assinatura Mercado Pago             | id, user_id, mp_id, status, periodo |

### 5.7 Pagamentos — Mercado Pago (assinatura do prestador)

Foco em assinatura SaaS do prestador. Intermediação financeira entre partes **fora do escopo V1**.

### 5.8 Geolocalização — PostGIS e mapas

Consultas espaciais com `ST_DWithin`.

### 5.9 Ferramentas de IA — Copiloto de Desenvolvimento

- **Claude:** Código principal (React Native, Hono, SQL)
- **ChatGPT:** Redação e UX Writing
- **Gemini:** Análise visual e pesquisa
- **Grok:** Contextualização e tendências
- **NotebookLM:** Síntese bibliográfica

---

## 6 Metodologia de Desenvolvimento

### 6.1 Vibe Coding com GSD

Metodologia focada em entregas concretas, tarefas fecháveis semanalmente no GitHub Projects.

### 6.2 Estratégia de Branches (Git Flow Simplificado)

- `main` — produção
- `develop` — integração
- `feature/*` e `fix/*`

Commits seguem Conventional Commits.

### 6.3 Fluxo Geral de Uso da Plataforma

**Tabela 4: Fluxo geral de uso (V1)**

| Etapa | Ator         | Ação |
|-------|--------------|------|
| 1     | Visitante    | Explora categorias |
| 2     | Novo usuário | Autentica-se (Clerk OTP) |
| 3     | Contratante  | Publica demanda |
| 4     | Prestador    | Completa perfil e portfólio |
| 5     | Contratante  | Busca e filtra |
| 6     | Contratante  | Solicita handoff |
| 7     | Ambos        | Negociam **fora da plataforma** |
| 8-11  | Ambos        | Atualizam status e avaliam |

### 6.4 Design e Prototipagem

Processo completo no Figma (Design System → Wireframes → Protótipo de alta fidelidade → Validação com usuários).

### 6.5 Segurança e Conformidade com a LGPD

- RLS no PostgreSQL
- JWT via Clerk
- Validação dupla (Zod)
- Conformidade LGPD (coleta mínima, direito de exclusão)

### 6.6 Testes e Validação

Testes manuais, de integração, automatizados (Vitest), usabilidade e segurança.

---

## 7 Resultados Esperados

- Aplicativo multiplataforma funcional (MVP)
- API integrada com Supabase, Clerk e Mercado Pago
- Banco com PostGIS e RLS
- Repositório GitHub organizado
- Impacto social na redução da informalidade na AMAUC

---

## 8 Considerações Finais

A plataforma **Opus Freelas** propõe resolver um problema real da região AMAUC com tecnologia moderna e escopo bem definido. A stack escolhida e a metodologia GSD + IA garantem entregas de qualidade e aprendizado prático alinhado ao curso.

---
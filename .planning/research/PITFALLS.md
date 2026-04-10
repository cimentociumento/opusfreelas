# Armadilhas do domínio — Marketplace local de serviços manuais e rurais (AMAUC)

**Projeto:** Opus Freelas  
**Domínio:** Plataforma multiplataforma conectando contratantes a prestadores de serviços manuais/rurais na AMAUC (Alto Uruguai Catarinense), com foco inicial no fluxo do contratante, fechamento fora da plataforma no V1 e monetização por assinatura do prestador.  
**Pesquisado:** 2026-04-09  
**Confiança geral:** **MÉDIA** — síntese de padrões de marketplaces bilaterais, dinâmica de canais informais no Brasil e restrições explícitas em `.planning/PROJECT.md`. Não há validação empírica ainda com usuários AMAUC; itens marcados como **(validar no pilots)** exigem evidência local.

## Resumo executivo

Marketplaces locais de serviço falham mais por **falta de liquidez geográfica** e **desalinhamento frente ao “jeito que já funciona” (indicação + WhatsApp)** do que por falta de features. No recorte AMAUC, somam-se **sazonalidade rural**, **reputação em rede densa** (cidade pequena) e o risco de **priorizar cadastros** em vez de **tempo até primeiro contato útil**. O V1 com fechamento externo reduz risco jurídico, mas **aumenta a pressão** para entregar valor contínuo (visibilidade, confiança, histórico) senão a assinatura do prestador não sustenta. Privacidade (LGPD), taxonomia de oferta alinhada ao vocabulário local e métricas de saúde da rede devem entrar cedo — não como “fase de compliance” tardia.

---

## Armadilhas críticas

Erros que costumam implicar **replanejamento forte**, **perda de confiança regional** ou **encerramento do experimento**.

### 1) Cold start: demanda primeiro sem “estoque mínimo” de oferta qualificada

**O que dá errado:** Contratantes publicam ou buscam e **não encontram prestadores** credíveis na localidade; desistem antes de formar hábito. O `PROJECT.md` prioriza o contratante no V1 — isso só funciona se existir **oferta mínima curada** (mesmo que pequena) nos primeiros municípios/categorias.

**Por que acontece:** Modelo bilateral exige **densidade simultânea**; métricas de “cadastros” mascaram ausência de **match útil**.

**Consequências:** Baixa retenção no lado demanda, NPS ruim por “app vazio”, marketing que **queima reputação** na região.

**Sinais de alerta (detecção precoce):** Alto tráfego ou cadastro de demanda, porém **altos cancelamentos** de pedidos de contato; **tempo até primeiro prestador visto** muito alto; buscas frequentes **zero-result** nas combinações (município × categoria) prioritárias; prestadores cadastrados mas **sem resposta/inatividade**.

**Estratégia de prevenção:**  
- Começar com **1–2 polos geográficos** (não “AMAUC inteira” no mesmo patamar de expectativa).  
- **Operação manual**: onboarding de prestadores “âncora”, confirmação de disponibilidade, **lista viva** por categoria.  
- Definir **SLA interno** de liquidez: ex. “toda demanda tipo X em município Y deve ver ≥N perfis ativos ou cair em fila de captação”.  
- Medir **liquidez** (contatos iniciados, respostas, repetição), não apenas MAU.

**Mapeamento por fase:**  
| Fase sugerida | Foco |
|---------------|------|
| Descoberta & piloto | Escolher microrregião/categorias âncora; compromisso com N prestadores verificados **antes** de abrir demanda pública em massa. |
| MVP demanda | Instrumentar zero-result e “empty state” com **CTA operacional** (ex.: “estamos recrutando em [cidade]”) em vez de experiência genérica. |
| Oferta & confiança | Rituais de reativação (check-in sazonal para serviços rurais). |

---

### 2) Subestimar o canal WhatsApp / indicação como baseline de produto

**O que dá errado:** O produto é **mais lento ou mais caro** do que “perguntar no grupo da igreja/colônia/associação”. Usuário testa uma vez e volta ao modo informal.

**Por que acontece:** Em economia com forte **confiança interpersonal**, o digital precisa vencer **fricção percebidamente zero** do offline.

**Consequências:** Baixa recorrência, uso esporádico só em “urgência”, má fama de “mais um anúncio”.

**Sinais de alerta:** Primeiro contato acontece na plataforma, mas **reengajamento** passa a ocorrer só por telefone; alto abandono após primeiro match; usuários pedem **“manda teu zap”** no primeiro turno e churn da plataforma.

**Estratégia de prevenção:**  
- V1 já prevê fechamento externo — **aceitar** isso e investir em valor **antes e depois** do Zap: fichas claras, histórico, avaliações, filtros por raio, provas de serviço.  
- Fluxos **mobile-first** e **baixa digitação** (templates de demanda, sugestões).  
- Opcional: integração pragmática **deeplink / compartilhar demanda** para WhatsApp sem quebrar rastreio básico **(validar no pilots)**.

**Mapeamento por fase:**  
| Fase sugerida | Foco |
|---------------|------|
| Descoberta & piloto | Observar **jornada real** (ETNO/interviews): onde nasce a demanda hoje. |
| MVP demanda | Reduzir passos até “pedido de contato” + **mensagem padrão** copiável. |
| Reputação | Avaliações visíveis e moderáveis — motivo para voltar à plataforma na próxima contratação. |

---

### 3) Geografia “alargada demais cedo” (diluição AMAUC)

**O que dá errado:** Cobertura nominal de muitos municípios com **poucos prestadores em cada um**; marketing regional gera expectativa que o produto não cumpre.

**Por que acontece:** Recorte AMAUC é correto estrategicamente, mas **densidade** é por vértice da rede local — “região” não é liquidez.

**Consequências:** CAC desperdiçado, impressão de plataforma “vazia” em toda parte.

**Sinais de alerta:** Padrão de **muitos municípios** com 1–2 prestadores; demanda concentrada em poucos polos mas busca espalhada; NPS divergente por cidade.

**Estratégia de prevenção:** **Expandir município a município** com critério de “liquidez mínima atingida”; UI que **não sugere cobertura** onde não há oferta real (honestidade operacional).

**Mapeamento por fase:**  
| Fase sugerida | Foco |
|---------------|------|
| Descoberta & piloto | Mapa de calor: onde já existe oferta comprometida. |
| MVP demanda | **Geofencing de UX** / municípios “ativos” vs “em breve”. |
| Escala AMAUC | Playbook de replicação por cidade (não marketing regional genérico). |

---

### 4) Buraco de confiança: verificação “básica” que não casa com risco percebido

**O que dá errado:** Serviços em propriedade rural e acesso a residência elevam **medo de estranho má-intencionado** ou trabalho mal feito. Telefone/CPF fracos + poucas avaliações **não sustentam** a promessa “confiáveis”.

**Por que acontece:** Times subestimam **assimetria de risco** entre contratante e prestador em contexto local.

**Consequências:** Baixa conversão, disputes violentos em redes sociais, dano à marca regional.

**Sinais de alerta:** Relatos de “perfil falso”; prestadores sem portfólio **aprovado** mas com alta visibilidade; pico de **denúncias**; contratantes insistindo só em “quem fulano conhece”.

**Estratégia de prevenção:**  
- Calibrar **níveis de selo** (documento, prova de ofício, tempo na plataforma, avaliações reais).  
- Política clara de **denúncia/remoção** e moderación humana nos primeiros meses.  
- Portfólio **obrigatório** por categoria onde fizer sentido (antes/depois, equipamentos).

**Mapeamento por fase:**  
| Fase sugerida | Foco |
|---------------|------|
| Oferta & confiança | Critérios explícitos de verificação + fila humana. |
| MVP demanda | Sinalização de confiança *antes* do contato (badges, completude do perfil). |
| Operação | Playbook de incidentes e comunicação de transparência. |

---

### 5) Monetizar assinatura antes de valor líquido para o prestador

**O que dá errado:** Assinatura vira **imposto** se leads forem fracos, repetidos ou de baixa intenção. Prestador churna e **difama** o produto localmente.

**Por que acontece:** Modelo por assinatura exige **promessa de fluxo** ou **benefício de reputação** mensurável.

**Consequências:** Churn alto, disputas de cobrança, imprensa/regional adverse.

**Sinais de alerta:** Assinantes **inativos**; conversão trial→pago baixa; tickets “não recebi retorno”; queixas de **duplicidade de leads**.

**Estratégia de prevenção:**  
- **Pilot** com período definido; preço alinhado a **número de contatos qualificados** ou visibilidade comprovada.  
- “Kill criteria” se **qualidade de lead** não bater meta nas primeiras semanas.  
- Clareza no contrato/comunicação: **o que assinatura cobre** no V1 (não prometer arbitragem que está fora de escopo).

**Mapeamento por fase:**  
| Fase sugerida | Foco |
|---------------|------|
| Descoberta & piloto | Validar **disposição a pagar** com entrevistas + pré-compromissos. |
| Monetização (assinatura) | Instrumentar **origem do lead**, CRM simples para prestador. |
| Reputação | Histórico e avaliações como **ativo** que justifica mensalidade. |

---

### 6) LGPD e dados sensíveis (localização, contato) como reflexo tardio

**O que dá errado:** Coleta **excessiva** de localização e telefone, bases sem retención/minimização, termos genéricos — risco regulatório e de **perda de confiança** (“venderam meu número”).

**Por que acontece:** Produto corre para velocidade; mapa de dados e bases legais **não acompanham**.

**Consequências:** Multas/sanções (cenário de maior gravidade), abandono, impossibilidade de integrações.

**Sinais de alerta:** Campos de formulário “por precaução”; ausência de **base legal** documentada por feature; terceiros (SMS, analytics) sem DPA; **retenção** indefinida de conversas.

**Estratégia de prevenção:** **Privacy by design**: inventário de dados por evento (cadastro, match, avaliação), minimização (ex.: localidade por município/raio onde bastar), política de retenção, canal de titular, vinculação clara de **prestadores/contratantes** a tratamento de dados. Documentação alinhada a orientações para marketplaces no Brasil (ver fontes).

**Mapeamento por fase:**  
| Fase sugerida | Foco |
|---------------|------|
| Descoberta & desenho | Data mapping + decisões de **minimização** antes do primeiro deploy público. |
| MVP demanda | Consentimentos contextuais para contato e visibilidade. |
| Escala | Revisão de subprocessadores e logs. |

---

## Armadilhas moderadas

### 7) Taxonomia e linguagem (“capineiro” vs rótulo genérico)

**O que dá errado:** Filtros e categorias **urbanas** não batam com **vocabulário local**; buscas falham por terminologia.

**Sinais de alerta:** Alto uso de **busca livre** com resultados ruins; prestadores escolhendo “outros”; suporte recebendo “não achei meu serviço”.

**Prevenção:** Co-criar taxonomias com **2–3 âncoras locais** por categoria; sinônimos; revisão trimestral.

**Fases:** Descoberta & piloto; MVP demanda.

---

### 8) Avaliações manipuladas ou conflitos de vizinhança

**O que dá errado:** Em redes pequenas, **vingança por review**, troca de favores ou fraude sistêmica.

**Sinais de alerta:** Distribuição bimodal só “5 ou 1”; correlação suspeita; picos após disputas offline.

**Prevenção:** Regras de elegibilidade (serviço “concluído” via declaração bilateral simples **(validar)**); moderação; limite de um review por job; possibilidade de **resposta** do prestador.

**Fases:** Reputação; Operação.

---

### 9) Sazonalidade rural ignorada no planejamento de roadmap

**O que dá errado:** Metas lineares em períodos de **safra, chuva, festas** locais; equipe conclui erradamente que “produto não pega”.

**Sinais de alerta:** Quedas periódicas alinhadas a calendário agrícola/eventos; categorias de máquinas **picando** só em janelas.

**Prevenção:** Calendário regional no planejamento; features de **disponibilidade sazonal** no perfil; comunicação com usuários sobre pausas.

**Fases:** Descoberta & piloto; Oferta & confiança; Operação.

---

### 10) Métricas de vaidade (cadastros, pageviews) em vez de saúde da rede

**O que dá errado:** Roadmap celebra números que **não predizem** retenção ou receita.

**Sinais de alerta:** Crescimento de cadastros com **flat** em contatos úteis; alta dependência de incentivos pagos.

**Prevenção:** Definir **north stars** por microrregião: ex. median time-to-first-qualified-contact, % demandas com ≥1 resposta em 24–48h **(ajustar conforme realidade operacional)**, repetição em 90 dias.

**Fases:** Todas; especialmente MVP demanda e Monetização.

---

## Armadilhas menores

### 11) Suporte sobrecarregado por “casos humanos”

**O que dá errado:** Sem triagem, time pequeno **vira call center**.

**Prevenção:** FAQs ultra-concretos, templates, rotas de denúncia claras.

**Fases:** Operação.

---

### 12) Dependência de um único canal de aquisição (ex.: só Meta Ads)

**O que dá errado:** CAC instável; desconexão com comunidade.

**Prevenção:** Parcerias **locais** (associações, sindicatos, cooperativas) **(validar)**; indicação boca a boca instrumentada.

**Fases:** Descoberta & piloto; Escala AMAUC.

---

## Tabela: tópico × armadilha provável × mitigação (para planejamento de fases)

| Tópico de fase | Armadilha provável | Mitigação resumida |
|----------------|-------------------|---------------------|
| Descoberta & piloto | Geografia larga demais | Polos + liquidez mínima explícita |
| MVP demanda | Busca vazia | Zero-result operacional + âncoras de oferta |
| Oferta & confiança | Verificação frágil | Selos, portfólio, moderación |
| Reputação & avaliação | Toxicidade local | Regras de elegibilidade e moderação |
| Monetização (assinatura) | Valor não percebido | Pilot, métricas de lead qualificado |
| Escala AMAUC | Cópia sem densidade | Playbook por município |
| Compliance & dados | LGPD reativa | Mapa de dados cedo, minimização |

---

## Fontes e nível de confiança

| Tema | Confiança | Notas |
|------|-----------|--------|
| Chicken-and-egg / liquidez em marketplaces | **MÉDIA–ALTA** | Padrão consolidado em literatura de plataformas; ver guias Reforge/Dokan/Jobtech Alliance (links abaixo). |
| Desintermediação / WhatsApp em serviços locais (BR) | **MÉDIA** | Forte face validity + relatos setoriais; falta estudo quantitativo específico AMAUC. |
| LGPD em marketplaces (BR) | **MÉDIA** | Relatório acadêmico FGV e guias de privacidade; detalhes de implementação exigem advogado local. |
| Conectividade e literacia digital no interior | **MÉDIA–BAIXA** | Heterogeneidade municipal; **validar** AMAUC com dados locais (operadoras, uso real). |

**URLs (consulta 2026-04-09):**  
- Reforge — cold start: https://www.reforge.com/guides/beat-the-cold-start-problem-in-a-marketplace  
- Dokan — erros comuns em marketplaces: https://dokan.co/blog/494632/marketplace-mistakes-to-avoid/  
- Jobtech Alliance — chicken and egg (PDF): https://jobtechalliance.com/wp-content/uploads/2026/03/Chicken-and-Egg-Dilemma-SOlving-for-two-sided-marketplaces-Jobtech-Alliance.pdf  
- Vindi — marketplace de serviços (modelos): https://blog.vindi.com.br/marketplace-de-servicos/  
- Iugu — modelos de marketplace: https://www.iugu.com/blog/marketplace-de-servicos  
- FGV — proteção de dados em marketplaces (PDF): https://direitorio.fgv.br/sites/default/files/arquivos/final_relatorio-protecao_de_dados_em_marketplaces_no_brasil.pdf  
- Fisher Phillips — cenários LGPD (inglês): https://www.fisherphillips.com/en/insights/insights/brazils-data-privacy-law-6-key-scenarios-to-consider  

---

## Lacunas para pesquisa posterior (dentro do projeto)

- Medição **real** de liquidez por município AMAUC e categorias “âncora”.  
- Disposição a pagar **assinatura** com preço e pacote testados em campo.  
- Políticas de **avaliação** aceitáveis culturalmente (evitar litígio offline).  

---

*Este arquivo alimenta o roadmap: use a coluna “Fase sugerida” como **atado** às fases numeradas quando `ROADMAP.md` existir — renomear para os IDs de fase do projeto sem mudar o conteúdo das mitigações.*

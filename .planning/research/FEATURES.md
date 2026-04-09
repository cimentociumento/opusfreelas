# Panorama de funcionalidades

**Dominio:** Marketplace local de servicos manuais e rurais (AMAUC / SC)  
**Escopo:** Produto tipo AMAUC Freelas — V1 com foco no contratante, fechamento fora da plataforma, monetizacao por assinatura do prestador  
**Pesquisado em:** 2026-04-09  
**Confianca geral:** MEDIA — padroes de mercado e literatura verificados por busca; recorte regional e decisões de produto consolidadas com **ALTA** confiança a partir de `.planning/PROJECT.md`.

---

## Table stakes

Funcionalidades que usuarios ja esperam de qualquer lugar onde se “acha profissional” ou “publica servico”. Ausencia delas gera desconfianca ou abandono.

| Funcionalidade | Por que e esperada | Complexidade | Dependencias | Notas |
|----------------|-------------------|--------------|--------------|-------|
| Publicacao de demanda/servico com contexto minimo | Contratante precisa explicar o que precisa sem burocracia | Baixa–Media | Cadastro contratante (minimo), categorias de servico | Tipo, localidade, janela, contato — alinhado ao escopo V1 em PROJECT.md |
| Busca e filtros por localidade + tipo de servico | Servico manual/rural e fortemente geografico | Media | Perfis de prestadores validos, taxonomia estavel | “Perto de mim” / municipio / raio |
| Perfil do prestador (localidade, raio, provas de servico) | Substituto parcial da indicacao boca a boca | Media | Upload de midia, modelo de dados de area | Fotos/portfolio elevam confianca |
| Contato direto ou handoff claro para conversa (ex.: telefone/WhatsApp) | No Brasil, negociacao e logistica costumam sair do app | Baixa | Politica de privacidade, consentimento de exibicao | V1: fechamento fora da plataforma — canal de saida e table stake, nao “anti-feature” |
| Verificacao basica (identidade/telefone) | Fraude e “fantasma” sao risco percebido alto em servicos locais | Media–Alta | Provedor de SMS/verificacao, fluxo de KYC leve | PROJECT.md exige no V1 |
| Avaliacoes pos-servico | Prova social; reduz assimetria de informacao | Media | Definir “momento de avaliar” sem pagamento in-app | Pode exigir confirmacao de contato/conclusao |
| Categorias/taxonomia alinhada ao que a regiao contrata | Usuario rural nao pensa em jargao abstrato | Media | Pesquisa local, evolucao iterativa | Incluir linguagem de campo (capina, rocada, maquinas, diarista, etc.) |
| Experiencia multiplataforma / mobile-usavel | Maior parte do uso e movel; sinal ruim se “so desktop” | Media–Alta | Design responsivo ou apps nativos posteriores | PROJECT.md: multiplataforma |

**Fontes (padroes de mercado):** marketplaces de servicos costumam combinar localizacao, perfil, reputacao e comunicacao (referencias agregadas: discussao de mercado classificado e servicos no Brasil; uso de WhatsApp como infraestrutura informal — ver Secao Fontes).

---

## Diferenciais

Nao sao sempre “inventar de zero”; muitas vezes sao **execucao focada** no recorte AMAUC + operacao rural/informal.

| Funcionalidade | Proposta de valor | Complexidade | Dependencias | Notas |
|----------------|-------------------|--------------|--------------|-------|
| Liquidez geografica proposital (só AMAUC primeiro) | Match relevante > catalogo nacional vazio | Baixa (produto), Media (operacao) | Moderacao, captacao local, marketing de Borda | Evita competir com generalistas na escala errada |
| Taxonomia e copy para **servicos rurais/manuais** | Generalistas sao fracos em sinais de confianca para campo | Media | Especialistas locais/co-criacao com usuarios | Diferencia do “GetNinjas generico” na percepcao |
| Transparencia de raio e municipio | “Vem ate aqui?” e objecao numero um fora da cidade | Baixa–Media | Geoloc ou entrada manual consistente | Complementa o filtro |
| Modelo de monetizacao por **assinatura** (nao só lead/credito) | Previsibilidade para prestador; alinhado ao V1 | Media | Billing, estados de assinatura, suporte | PROJECT.md: sem taxa de intermediacao no V1 |
| Fluxo de conexao **leve** (sem contrato/pagamento in-app obrigatorios) | Baixa friccao encaixa economia informal local | Baixa (V1) | Educacao sobre limites legais, termos claros | Reduz barreira de adocao inicial |
| Sinais de confianca visiveis (“verificado”, fotos antes/depois) | Curadoria percebida sem policia exagerada | Media | Politica de moderacao leve | Combinar com verificacao basica |
| Opcao de midia **acessivel** (foto rapida, audio futuro) | Uso forte de WhatsApp e comunicacao oral em periferias/rurais | Media–Alta | Armazenamento, moderacao, custo | *Audio*: candidato pos-V1 — depende de moderacao e suporte |

---

## Anti-features

Funcionalidades que **parecem** “marketplace completo” mas que, neste dominio e fase, aumentam risco juridico, friccao ou custo sem liquidez.

| Anti-feature | Por que evitar no V1 (AMAUC Freelas) | O que fazer em vez disso |
|--------------|--------------------------------------|---------------------------|
| Contratos digitais com validade juridica robusta | Complexidade juridica e operacional | Termos simples + conexao; evolucao em milestone posterior |
| Negociacao/aceite formal completo in-app | Mesmo raciocinio; atrito para informal | Conversa fora + registro voluntdade de “fechei com X” opcional mais tarde |
| Cobranca por taxa de intermediacao / escrow obrigatorio | PROJECT.md fora de escopo no V1; exige pagamento, disputas, chargeback | Assinatura do prestador; pagamento direto entre partes |
| Onboarding estilo banco para contratante | Abandono alto em demanda local | Cadastro minimo; pedir o restante sob demanda |
| Cacife “nacional” antes de liquidez municipal | Experiencia vazia mata retencao | Crescimento geografico controlado apos densidade |
| Chat in-app **sem** saida para WhatsApp | Usuario brasileiro rompe fluxo; sensacao de “pegeotico” | Permiti handoff cedo ou integre deeplink WhatsApp quando possivel |
| Algoritmos opacos de ranking *sem* explicacao | Desconfianca de prestador rural (“por que eu nao apareco?”) | Regras simples: distancia, disponibilidade, verificacao, resposta |
| Exigencias fiscais pesadas no cadastro | NBS/ISS sao reais para **nota**, mas onboarding fiscal completo assusta autonomo inicial Catalogo de servico pode evoluir sem bloquear MVP | Orientacao generica + features fiscais quando houver pagamento/nota in-app |

---

## Dependencias entre funcionalidades

```
Taxonomia de servicos + Geografia (municipio/raio)
    ↓
Perfil do prestador (incl. portfolio)
    ↓
Busca/filtros  ←→  Publicacao de demanda (mesmo vocabulario)
    ↓
Contato / handoff
    ↓
Conclusao declarada (implicita ou explicita)
    ↓
Avaliacao
    ↓
(Reputacao retroalimenta ranking/exibicao — fase madura)

Verificacao basica ──→ Badge/sinal no perfil (depende de fornecedor e politica)
Assinatura prestador ──→ Permite “anunciar/ofertar” em escala (depende de regras de listagem)
```

- **Avaliacao** depende de um evento minimamente auditavel (ex.: “marcar como concluido”, ou janela pos-contato) para reduzir fake reviews — sem isso, reputacao vira ruído.  
- **Monetizacao por assinatura** depende de valor percebido na visibilidade; sem busca/demanda, churn alto.

---

## Recomendacao de MVP (alinhada ao PROJECT.md)

**Priorizar (ordem logica, nao apenas desejo):**

1. Taxonomia + publicacao de demanda + busca/filtros (liquidez minima).  
2. Perfil do prestador com localidade, raio e fotos.  
3. Verificacao basica + exibicao de status de confianca.  
4. Fluxo de contato e avaliacao pos-contato/conclusao.  
5. Assinatura do prestador ligada a beneficios de visibilidade.

**Adiar:** escrow, contratos formais, fiscal completo in-app, chat pesado exclusivo, expansao fora AMAUC.

---

## Lacunas e flags para pesquisa de fase

- Definicao operacional de “avaliacao justa” sem pagamento in-app (fraude, retaliacao). — **Pesquisa de fase**  
- Custo e fornecedor de verificacao (SMS, documento) em microempreendedores. — **Pesquisa de fase**  
- Necessidade de audio na entrada de dados (acessibilidade) vs moderacao. — **Validacao com usuarios**

---

## Fontes

| Fonte | Uso neste documento | Confianca |
|-------|---------------------|-----------|
| `.planning/PROJECT.md` | Escopo V1, monetizacao, confianca, anti-features explicitos do produto | Alta |
| [GetNinjas](https://www.getninjas.com.br/) | Referencia de mercado Brasil — leads, categorias, profissionais | Media (observacao de produto; nao documentacao publica detalhada) |
| [The Verge — WhatsApp e trabalhadores informais no Brasil](https://www.theverge.com/22734705/facebook-whatsapp-outage-brazil-informal-workers-economy) | WhatsApp como infraestrutura; implicacao para handoff e confianca | Media |
| [KPMG — NBS / classificacao de servicos NFS-e Brasil (2025)](https://kpmg.com/us/en/taxnewsflash/news/2025/10/brazil-standard-reference-classifying-services-e-invoicing.html) | Contexto fiscal futuro; nao bloqueia MVP de conexao | Media |
| Agregadores / listas de “marketplace features” (ex. artigos 2026 sobre trust + booking + mobile) | Checklist generico de mercado — **filtrado** pelo escopo AMAUC | Baixa–Media — tendencias; nem tudo aplica a rural/V1 |

---

*Documento destinado a alimentar definicao de requisitos e roadmap; categorias devem permanecer explicitas em especificacoes.*

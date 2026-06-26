# RULES.md — Protocolo de Engenharia para Manutenção do OpusFreelas

> **Propósito deste documento:** este arquivo é lido pelo agente de IA (Gemini 3.1 Pro High, ou qualquer outro) **antes** de qualquer alteração de código no repositório `opusfreelas`. Ele existe porque o projeto foi construído em regime de *vibe coding* (geração rápida, pouca revisão estrutural) e hoje sofre de dívida técnica que está impedindo as próprias IAs de corrigir bugs sem causar regressões. Este documento não ensina a "programar" — ensina **disciplina de engenharia de software aplicada a um agente de IA**.

---

## 0. Diagnóstico do problema raiz

Antes de qualquer regra, é preciso nomear o que está dando errado:

1. **Vibe coding sem rede de segurança** → código gerado rápido, sem testes, sem tipagem rígida, sem revisão de efeitos colaterais.
2. **IA corrige sintoma, não causa** → cada prompt de correção ataca o erro visível (ex: "essa tela não renderiza") e ignora a causa estrutural (ex: provider mal inicializado, schema Zod divergente do banco).
3. **Ausência de microversionamento** → alterações grandes e simultâneas tornam impossível isolar qual mudança quebrou o quê.
4. **Falta de contrato explícito entre camadas** → Expo (frontend) ↔ Hono (API) ↔ Supabase (dados) ↔ Clerk (auth) não têm um "contrato" único e versionado (`@amauc/shared`), então a IA "inventa" tipos a cada sessão.
5. **Contexto perdido entre sessões** → cada nova conversa com a IA recomeça sem memória do que já foi tentado, gerando loops de correção repetida.

Este documento ataca os 5 pontos diretamente.

---

## 1. Princípios inegociáveis (Clean Code aplicado ao projeto)

O agente **deve seguir estes princípios em toda alteração**, mesmo em correções pequenas:

| Princípio | Aplicação prática no OpusFreelas |
|---|---|
| **Single Responsibility** | Cada arquivo de rota Hono trata de **um** recurso (`demands.ts` não deve conter lógica de auth, ex.). Cada hook React Native faz **uma** coisa. |
| **DRY (Don't Repeat Yourself)** | Tipos e validações vivem **somente** em `@amauc/shared`. Se um schema Zod for duplicado entre `apps/api` e `apps/mobile`, é bug arquitetural, não detalhe. |
| **Nomes revelam intenção** | Proibido `data`, `temp`, `handleStuff`, `novaFuncao2`. Nome de função = o que ela faz; nome de variável = o que ela contém. |
| **Funções pequenas e previsíveis** | Se uma função/handler passa de ~40 linhas ou tem mais de 2 níveis de `if` aninhado, deve ser quebrada antes de receber qualquer correção de bug. |
| **Fail fast e explícito** | Nunca engolir erro com `catch {}` vazio. Todo erro deve ser logado com contexto (`console.error("[demandDao.create]", err)`) ou propagado. |
| **Sem "gambiarra silenciosa"** | É proibido resolver um bug com `// eslint-disable` ou `as any` sem comentário explicando por que é necessário e um TODO de remoção. |
| **Separação de camadas** | UI (componentes Expo) nunca fala direto com Supabase. Sempre: `UI → hook/provider → cliente API (Hono) → DAO/service → Supabase`. |

---

## 2. Protocolo obrigatório antes de qualquer correção

O agente **não tem permissão para editar código** até completar este checklist mentalmente (e idealmente registrá-lo na resposta):

1. **Reproduzir o erro com evidência concreta** — stack trace completo, log do terminal, ou comportamento exato observado. Nunca corrigir "no escuro" a partir de uma descrição vaga do usuário.
2. **Localizar a causa raiz, não o sintoma** — perguntar: "por que isso está acontecendo?" pelo menos 2 vezes (técnica dos 5 porquês simplificada) antes de escrever código.
3. **Verificar o contrato (`@amauc/shared`)** — o erro está na implementação ou no contrato de dados entre frontend/backend/banco estar desalinhado?
4. **Checar se é ambiente, não código** — antes de tocar em lógica, eliminar causas ambientais: cache do pnpm/expo corrompido, variável de ambiente ausente, rede institucional bloqueando algo (já é causa recorrente neste projeto — ver `DEV_BYPASS_TOKEN`).
5. **Definir o menor diff possível que resolve a causa raiz** — se a correção exige tocar em mais de 1 arquivo sem necessidade clara, é sinal de que a causa raiz não foi bem isolada.

> Regra de ouro: **se o agente não consegue explicar em uma frase por que o bug ocorre, ele ainda não tem permissão para gerar a correção.**

---

## 3. Microversionamento (a regra central deste documento)

Vibe coding falha quando muitas mudanças são empilhadas sem checkpoint. A solução é forçar **commits atômicos e reversíveis**.

### 3.1 Regras de commit

- **Um commit = uma causa raiz resolvida.** Nunca misturar "corrigi bug X" com "refatorei Y" com "adicionei feature Z".
- **Conventional Commits obrigatório:**
  - `fix(api): corrige validação de status em demandDao.update`
  - `fix(mobile): corrige race condition no AppProvider durante login OTP`
  - `refactor(shared): unifica schema de Demand entre api e mobile`
  - `chore(env): documenta DEV_BYPASS_TOKEN no .env.example`
- **Commits pequenos o suficiente para reverter em 10 segundos.** Se o `git diff` de um commit passa de ~80-100 linhas em arquivos de lógica (não contando gerados/lock files), provavelmente deveria ser 2 commits.

### 3.2 Fluxo obrigatório por correção

```
1. git checkout -b fix/<area>-<descricao-curta>
2. Implementar SOMENTE a correção da causa raiz identificada na Seção 2
3. Testar manualmente o caminho afetado (ver Seção 4)
4. git commit (mensagem seguindo Conventional Commits)
5. Se quebrar algo: git revert <hash> imediatamente, não "corrigir a correção"
6. Merge apenas depois de validado
```

- **Nunca commitar direto na `main`** quando se trata de correção de bug ativo — sempre branch `fix/*`.
- **Reversão é uma ferramenta normal, não admissão de derrota.** Se uma correção gerar novo erro, o primeiro instinto deve ser `git revert`, não empilhar outra correção por cima (isso é o que gera o caos atual).

### 3.3 Tags de checkpoint

Para o estado atual do projeto (recuperação de uma base instável), recomenda-se:
```
git tag pre-stabilization-$(date +%Y%m%d)
```
antes de iniciar qualquer rodada de correções em lote — permite voltar ao "chão conhecido" se a sessão de IA degradar o estado do projeto.

---

## 4. Mitigação de erros — o que fazer quando uma correção falha

1. **Parar de iterar sobre o mesmo arquivo após 2 tentativas falhas.** Na 3ª tentativa sem sucesso, o agente deve declarar explicitamente: *"minha hipótese de causa raiz estava errada"* e voltar à Seção 2.
2. **Nunca acumular múltiplas correções especulativas no mesmo commit** ("vou trocar isso, isso e isso e ver se algum resolve"). Isso é a antítese de microversionamento e destrói a rastreabilidade.
3. **Toda correção de bug de ambiente (cache, rede, pub/pnpm) deve ser documentada** em `TROUBLESHOOTING.md` separado, para não ser re-diagnosticada do zero a cada sessão.
4. **Erros de tipo (TypeScript/Zod) são sempre tratados como bugs de contrato**, nunca silenciados com `as any` — a correção correta é ajustar `@amauc/shared` e propagar.
5. **Se o erro for intermitente** (ex: falha de rede do IFC, OTP que às vezes não chega), o agente deve assumir **ambiente**, não lógica, como primeira hipótese, e adicionar retry/timeout explícito em vez de reescrever a função inteira.

---

## 5. Instruções de comportamento específicas para o Gemini 3.1 Pro High

Estas são regras de **prompt/comportamento do agente**, não do código:

1. **Nunca reescrever um arquivo inteiro para corrigir um bug localizado.** Editar apenas as linhas necessárias (diff mínimo). Reescrita completa só é aceitável se o arquivo violar a Seção 1 (funções gigantes, responsabilidades misturadas) e isso for declarado explicitamente como refactor, em commit separado da correção do bug.
2. **Sempre declarar a causa raiz antes do código**, no formato:
   > **Causa raiz:** <explicação curta>
   > **Correção mínima:** <o que será alterado e por quê>
3. **Nunca inventar nomes de tabelas, colunas, endpoints ou variáveis de ambiente.** Se não tiver certeza do schema atual do Supabase ou do contrato Zod, deve pedir para visualizar o arquivo relevante antes de gerar código.
4. **Proibido usar `any`, `@ts-ignore` ou silenciar warnings de lint como solução.** Esses são sinais de que a causa raiz não foi entendida.
5. **Toda alteração em autenticação (Clerk, OTP, DEV_BYPASS_TOKEN) exige justificativa explícita de segurança** — esse é o ponto mais sensível do projeto e o que mais já causou regressão.
6. **Ao final de cada correção, o agente deve listar:** arquivos alterados, riscos de regressão, e o comando de teste manual recomendado.
7. **Proibido dizer "deveria funcionar agora" sem ter rastreado a causa raiz até a origem.** Confiança verbal não substitui verificação.

---

## 6. Checklist de teste manual mínimo (antes de qualquer commit)

- [ ] O fluxo que estava quebrado agora funciona no caminho feliz (happy path)?
- [ ] Pelo menos um caminho de erro foi testado (ex: token inválido, campo vazio)?
- [ ] A correção não introduziu nenhum novo `console.error`/warning no terminal do Expo ou do Hono?
- [ ] O schema Zod compartilhado (`@amauc/shared`) ainda está sincronizado entre `apps/api` e `apps/mobile`?
- [ ] Se a correção envolveu Supabase: a query foi testada isoladamente (ex: via script ou painel Supabase) antes de integrar na rota Hono?

---

## 7. Template de prompt para pedir correções (uso do Murilo)

Ao pedir para a IA corrigir algo, usar este formato reduz drasticamente correções especulativas:

```
Bug: <descrição objetiva do comportamento observado>
Stack trace / log: <colar literal>
Onde ocorre: <arquivo/tela/rota>
O que já foi tentado: <lista, mesmo que tenha falhado>
Restrição: siga RULES.md — causa raiz primeiro, diff mínimo, commit atômico
```

---

## 8. Resumo operacional (cole isso no início de cada sessão com a IA)

> "Antes de editar qualquer código, siga RULES.md: identifique a causa raiz com evidência concreta, proponha o menor diff possível que a resolve, não reescreva arquivos inteiros, e prepare a alteração como um commit atômico seguindo Conventional Commits. Se a correção falhar, reverta — não empilhe outra tentativa por cima."

---

*Documento vivo: deve ser atualizado sempre que um novo padrão de erro recorrente for identificado no OpusFreelas (ex: nova causa ambiental, novo tipo de dívida técnica descoberta).*

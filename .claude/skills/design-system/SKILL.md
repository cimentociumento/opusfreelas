---
name: design-system
description: Direção visual do Opus Freelas e as regras que a mantêm coerente. Use ao criar ou alterar qualquer tela, componente ou estilo do app mobile, ao escolher cor, tipografia, espaçamento ou hierarquia, e quando o usuário disser que algo está feio, genérico, desalinhado ou sem identidade.
---

# Sistema visual — Opus Freelas

## Direção
**Limpo e neutro**, na linha de Linear, Notion e Vercel. Superfície branca,
neutros quentes, bordas discretas, tipografia sem drama, cor usada com
parcimônia. A confiança vem da precisão do espaçamento e da hierarquia — não
de cor forte, sombra ou ornamento.

Essa é a estética-casa do shadcn/ui, que é o que o React Native Reusables
implementa. Seguir os componentes do RNR sem "melhorar" já entrega a direção.

## Fonte da verdade
Tokens vivem em `apps/mobile/global.css` como variáveis CSS, expostas ao
Tailwind via `tailwind.config.js`. Nenhum valor de cor, raio ou espaçamento
fora daí.

Nunca escreva cor literal em `className` (`bg-[#116530]`) nem em `StyleSheet`.
Se falta um token, adicione ao `global.css` com nome semântico
(`--warning`, não `--yellow`).

## Regras de composição

**Cor.** Um acento por tela. `--primary` é o verde da marca e fica reservado
para a ação principal; tudo mais é neutro. Estado (destrutivo, aviso, sucesso)
só aparece quando comunica estado real, nunca como decoração.

**Borda antes de sombra.** `border-border` define separação. Sombra fica para
o que flutua de verdade sobre o conteúdo: modal, popover, toast.

**Espaçamento é a escala do Tailwind.** Sem número mágico. Ritmo vertical
consistente importa mais que qualquer outra decisão visual nesta direção.

**Tipografia.** Duas famílias no máximo, três pesos no máximo. Corpo em
`font-normal`, ênfase em `font-medium`. `font-bold` é raro. Tamanho comunica
hierarquia melhor que peso.

**Raio.** `--radius` uniforme, vindo do token. Não misture raios na mesma tela.

**Alvo de toque** nunca abaixo de 44pt. O público usa o app ao ar livre, em
Android de entrada.

**Contraste** mínimo 4.5:1 para texto. Uso ao ar livre sob sol pede folga
acima disso — evite cinza claro sobre branco para informação que importa.

## Componentes
Use os componentes de `components/ui/` (vindos do RNR). Antes de criar um
componente novo, verifique se um existente com variante resolve. Componente
novo só quando o padrão realmente não existe no registry.

Ao adicionar do registry:
```bash
npx @react-native-reusables/cli@latest add <componente>
```
O código é copiado para dentro do repositório e passa a ser nosso. Editar é
permitido; editar sem motivo não.

## Os quatro estados
Toda tela que carrega dado precisa dos quatro, distinguíveis:
carregando, vazio, erro, conteúdo.

Vazio é convite para agir, não pedido de desculpa: "Publique sua primeira
demanda", não "Nenhum resultado encontrado". Erro diz o que houve e o que
fazer, sem pedir desculpa e sem vaguidão.

## Copy
Voz ativa, verbo primeiro. O botão diz o que acontece: "Publicar demanda", não
"Enviar". A ação mantém o mesmo nome no fluxo inteiro — botão "Publicar" gera
aviso "Publicada". Vocabulário do usuário: demanda, prestador, município —
nunca payload, registro, entidade.

## Verificação
Toda mudança visual passa pela skill `ui-review`: rodar o alvo web
(`cd apps/mobile && pnpm web`), capturar com Playwright MCP em 375px e 1440px,
comparar antes e depois. Editar UI sem ver o resultado é a causa da maioria dos
retrabalhos.

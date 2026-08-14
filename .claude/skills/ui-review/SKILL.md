---
name: ui-review
description: Revisar e melhorar UI do app mobile do Opus Freelas com verificação visual real via Playwright MCP no alvo web. Use ao ajustar layout, espaçamento, tipografia, estados de carregamento/erro/vazio, acessibilidade, ou quando o usuário disser que uma tela está feia, quebrada ou confusa.
---

# Revisão de UI com verificação visual

React Native tem menos ferramenta de inspeção que web. A vantagem deste projeto
é que ele roda em `react-native-web` — então dá para **ver de verdade** o
resultado, em vez de editar no escuro.

## Pré-requisito: enxergar a tela
O app precisa estar rodando no alvo web:
```bash
cd apps/mobile && pnpm web     # http://localhost:8081
```
Com o Playwright MCP conectado, navegue até a rota e capture screenshot antes de
propor qualquer mudança. Editar UI sem ver o estado atual é a causa de metade
dos retrabalhos.

## Fonte da verdade: design tokens
`apps/mobile/components/theme.ts` define cores, spacing, borderRadius e
typography. Toda mudança visual usa esses tokens. Valor hardcoded em
`StyleSheet.create` é defeito — se falta um token, proponha adicioná-lo ao
theme em vez de inventar um número solto na tela.

A paleta é verde (`primary #116530`) com acento laranja (`secondary #ff6b35`) —
coerente com o contexto rural/agrícola. Não introduza cor fora do theme.

## Ciclo: capturar → propor → confirmar → verificar
1. **Capturar** — screenshot do estado atual, em largura mobile (375px) e
   desktop (1440px), já que o alvo web também é usado.
2. **Propor** — descreva a mudança e por quê, referenciando os tokens. Espere
   confirmação antes de editar em mudanças subjetivas de layout.
3. **Editar** — diff mínimo, usando os componentes existentes (`Button`, `Card`,
   `Toast`, `AlertModal`) em vez de criar variantes novas.
4. **Verificar** — novo screenshot, comparar com o anterior, confirmar que não
   quebrou outra largura.

## O que revisar em cada tela
- **Estados**: carregando, vazio, erro e sucesso existem e são distinguíveis?
  Tela sem estado vazio é problema real num marketplace que começa sem oferta.
- **Hierarquia**: o que é mais importante na tela é o que mais chama atenção?
- **Toque**: alvos de toque com pelo menos 44x44pt.
- **Contraste**: texto sobre fundo colorido atinge 4.5:1 (WCAG AA)?
- **Texto**: em pt-BR, sem string hardcoded quando existe `constants/strings.ts`.
- **Rede lenta**: a tela se comporta bem com resposta demorada? O público é
  rural, com conectividade intermitente.

## Restrições
Não migre biblioteca de UI. O projeto usa StyleSheet nativo com design tokens
próprios, e isso funciona — trocar por Tamagui/NativeWind/gluestack agora seria
um rewrite arriscado numa base já frágil, sem ganho para o MVP. Se o usuário
pedir explicitamente, aponte o custo antes de começar.

Não crie componente novo se um existente resolve. `components/` já tem Button,
Card, Toast, AlertModal, ErrorState, ErrorBoundary.

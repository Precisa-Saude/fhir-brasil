# Plano — linguagem visual da /laudos no site

## Objetivo

Aproximar o visual da landing de fhir-brasil da landing de Precisa Laudos
(`precisa-saude.com.br/laudos`), a mesma atualização feita no medbench-brasil
(Precisa-Saude/medbench-brasil#72) e no datasus-viz
(Precisa-Saude/datasus-viz#70). Atualização só visual: nenhum texto, dado ou
seção novos.

Referência normativa: `platform/docs/design/linguagem-visual.md` (v0.1,
10/09/2026) e a implementação em `platform/apps/landing/src/components/laudos/`.

## Decisões

- **Fontes.** Margem e Pausa carregadas de
  `https://www.precisa-saude.com.br/fonts/` (CORS aberto). Os arquivos,
  licenciados, não entram neste repositório público. Saem Roboto, Roboto
  Serif e Roboto Mono; código usa o mono do sistema.
- **Papéis tipográficos.** Pausa 300 nos títulos; Margem no corpo, dados e
  interface. Escala em `site/src/lib/typography.ts`, a mesma dos outros sites.
- **Cabeçalho.** Roxo sólido, sem blur; GitHub em contorno branco com hover
  menta.
- **Fundos.** Saem `MosaicBg` e `CornerSquares`, família anterior de formas.
  Entra o `SectionBackdrop` da /laudos em hero, O problema, Padrões e Código
  aberto, com lado e intensidade alternados. Fica fora de A solução,
  Ecossistema, Comece em minutos e Pacotes: texto em duas colunas ou código
  ficariam sobre as formas.
- **Hero.** Campo neutro, texto à esquerda, título em Pausa com grifo menta,
  a linha "Código aberto · TypeScript · Zero deps" como sobretítulo, CTA de
  documentação em pílula, comando de instalação em superfície opaca e os selos
  como linha de base.
- **Seções.** Títulos à esquerda, divisória de 1px, alternância entre fundo
  neutro e `muted`. A solução e Ecossistema viram listas com divisórias
  (numeradas em A solução), sem grade de cartões; Pacotes vira linhas; Padrões
  mantém cartões chapados, sem aparência de selo.
- **Código.** Tema de sintaxe da marca no Shiki sobre `#463C6D`; todos os tons
  passam de 4,5:1.
- **Encerramento.** Código aberto em roxo, com ação principal em menta, como o
  contato da /laudos.
- **Rolagem suave** nas âncoras, desligada com movimento reduzido.

## Etapas

- [x] Fontes e tokens (`index.html`, `index.css`, `tailwind.config.js`)
- [x] Escala tipográfica e primitivos (`GridSection`, `SectionBackdrop`)
- [x] Cabeçalho
- [x] Oito seções
- [x] Verificação em 1440 e 375 px
- [ ] Movimento reduzido

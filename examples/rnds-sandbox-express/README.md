# Exemplo: rnds-sandbox + Express + HTML/JS

Backend Node/Express que usa `@precisa-saude/fhir-rnds-sandbox`
em-processo, e um frontend HTML/JS sem framework que dispara as
chamadas e renderiza a resposta JSON na tela.

Roda inteiramente local: zero credencial, zero certificado.

## Como rodar

A partir da raiz do monorepo:

```bash
pnpm install
pnpm --filter @fhir-brasil-examples/rnds-sandbox-express start
```

Ou direto neste diretório:

```bash
pnpm install
node server.mjs
```

Abra <http://127.0.0.1:3000>.

Variáveis de ambiente opcionais:

| Variável   | Padrão                | Efeito                                               |
| ---------- | --------------------- | ---------------------------------------------------- |
| `PORT`     | `3000`                | Porta do Express                                     |
| `SCENARIO` | `paciente-com-exames` | Cenário do sandbox (`internacao`, `vacina`, `vazio`) |

## Arquitetura

```
                ┌─────────────────────┐
                │  Browser            │
   GET /        │  index.html + app.js│
   GET /api/... │                     │
                └──────────┬──────────┘
                           │ fetch()
                           ▼
       ┌───────────────────────────────────┐
       │  Express (server.mjs)             │
       │  ┌───────────────────────────┐   │
       │  │ rnds-sandbox em-processo  │   │
       │  │  (porta efêmera)          │   │
       │  └───────────────────────────┘   │
       │  • busca token no boot           │
       │  • forwarda fetch(sandbox)       │
       │    com bearer + CNS headers      │
       └───────────────────────────────────┘
```

O backend Express:

1. Inicializa o sandbox em-processo via `createSandboxServer({ port: 0 })`.
2. Faz `POST /api/token` no sandbox e guarda o JWT.
3. Expõe endpoints `/api/...` que o frontend chama; cada um repassa a
   chamada para o sandbox adicionando os headers que um cliente RNDS
   real envia: `X-Authorization-Server: Bearer <jwt>` +
   `Authorization: <CNS>`.

O frontend é HTML/CSS/JS puro — `<script>` tradicional, sem build.

## O que o exemplo demonstra

- **API programática** do sandbox: como bootar e parar via código.
- **Forma das chamadas RNDS**: paths, headers, body — exatamente o
  que um cliente em produção envia/recebe.
- **Round-trip submit→search**: clique em "Buscar Observations"
  para ver o histórico, depois "Submeter" e clique de novo — o total
  sobe e o novo código LOINC aparece na lista (mesma semântica que a
  RNDS expõe via `GET /Observation?subject=...`).
- **Renderização de respostas FHIR**: o `<pre>` mostra Patient,
  Organization, Practitioner, Bundle e OperationOutcome cruas, sem
  abstração — útil para inspeção e ensino.
- **JWKS**: o botão "JWKS" mostra o documento de chave pública que
  permitiria validar a assinatura do token via `jose`/`jwt.io`.

## O que NÃO está aqui (de propósito)

- Sem React/Vue/Svelte/etc — HTML+JS puro.
- Sem CSS framework — um único arquivo `style.css` enxuto.
- Sem mTLS no exemplo — o sandbox roda em modo permissivo para
  simplicidade de demo. Para exercitar mTLS, suba o sandbox
  separadamente com `--mtls` e ajuste o `sandboxBase` em `server.mjs`.

## Próximos passos

- Trocar `SCENARIO` para ver outras formas de Bundle pré-carregado.
- Editar o `sampleBundle()` em `server.mjs` para experimentar outros
  recursos FHIR (DiagnosticReport, Immunization, Encounter).
- Adicionar endpoints novos no Express e botões no frontend para
  cobrir mais cenários do seu caso de uso.

## Licença

Apache-2.0 — mesmo do monorepo.

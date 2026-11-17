# Plano: publicar o IG pelo site

## Objetivo

Servir os artefatos do Implementation Guide pelo site em Cloudflare Pages, de
modo que cada recurso de conformidade responda em JSON exatamente na sua URL
canônica. A especificação Open Labs Brasil manda os laboratórios validarem
contra perfis como
`https://fhir-brasil.dev.br/ig/StructureDefinition/br-lab-appointment`, e hoje
qualquer caminho do site, inclusive um inexistente, devolve a página inicial
com status 200. O pacote não está em registro nenhum, então um laboratório não
consegue baixar um perfil sequer.

Decisão do Rafael: publicar pelo site, e não pelo Simplifier.

## Contexto levantado antes de implementar

- O site (`site/`) é um app Vite de uma página só, sem rotas no cliente. O
  build é `tsc && vite build` e a saída vai para `site/dist`.
- O deploy (`_deploy-site.yml`) roda `pnpm turbo run build --filter=@fhir-brasil/site...`
  e publica `site/dist`, mas só quando o push mexe em algum prefixo de
  `site_source_path`, que hoje é só `site/`. Um PR que muda só o FSH não
  republicaria o site.
- O SUSHI (`fsh-sushi`, devDependency da raiz) gera 63 recursos. Têm `url` sob
  `https://fhir-brasil.dev.br/`: 20 StructureDefinition e 9 ValueSet em
  `/ig/...`, o ImplementationGuide em `/ig/ImplementationGuide/...` e 7
  CodeSystem em `/CodeSystem/...`, **fora** de `/ig/`. O `CodeSystem-cid-10`
  tem `url` em `hl7.org` e os exemplos têm `url` em `laboratorio.example` ou
  nenhuma: vão só no pacote.
- Nenhum desses caminhos colide com arquivo do site (`index.html`, `assets/`,
  favicons, `_headers`, `_redirects`).
- Cloudflare Pages, conferido na documentação atual e com
  `wrangler pages dev` numa árvore de teste:
  - a regra `/* /index.html 200` do `_redirects` é ignorada ("Infinite loop
    detected in this rule and has been ignored"). O que devolve a página
    inicial em caminho desconhecido é o comportamento padrão de SPA, que vale
    quando não existe `404.html` na raiz, e ele só entra quando nenhum arquivo
    estático casa com o caminho. Arquivo estático ganha;
  - arquivo sem extensão sai sem tipo útil, e um `Content-Type` no `_headers`
    substitui o tipo padrão;
  - `_redirects` não aceita status 404, mas um `404.html` dentro de um
    diretório responde 404 para os caminhos desconhecidos daquele diretório,
    sem mexer no resto do site;
  - o `_headers` casa pela URL pedida, então a resposta 404 de um diretório
    com regra de `Content-Type` também sai com aquele tipo.

## Critérios de aceite

Cada critério traz o comportamento observável e o comando que o prova.

1. **Cada recurso responde na própria URL.** Depois do build do site, todo
   recurso do pacote cuja `url` começa com `https://fhir-brasil.dev.br/` tem um
   arquivo em `site/dist` no caminho da URL, e o JSON desse arquivo tem a mesma
   `url`. As três URLs citadas na Open Labs Brasil (`br-lab-appointment`,
   `payment-link` e `lab-access-scope`) estão entre elas.
   Prova: `pnpm turbo run test --filter=@fhir-brasil/site`, testes "cada
   recurso responde na própria URL".
2. **O tipo de conteúdo é FHIR JSON.** O `_headers` publicado tem uma regra
   com `Content-Type: application/fhir+json; charset=utf-8` cobrindo o caminho
   de cada um desses recursos.
   Prova: mesmo comando, teste "o \_headers cobre todo caminho servido".
3. **O pacote é baixável de caminho estável.** `site/dist/ig/package.tgz`
   existe e contém `package/package.json` com `name` igual a
   `br.dev.fhir-brasil.core` e `version` igual à do `sushi-config.yaml`.
   Prova: mesmo comando, teste "o pacote está em /ig/package.tgz".
4. **Há um índice legível em `/ig/`.** `site/dist/ig/index.html` lista cada
   recurso servido com link para a URL dele e traz o link do pacote.
   Prova: mesmo comando, teste "o índice lista todo recurso servido".
5. **Não dá para divergir do FSH.** A saída é gerada no `build` do site
   (nada gerado é versionado), o cache do turbo considera `ig/` como entrada
   desse build, e o deploy dispara quando `ig/` muda.
   Prova: `git status --short` limpo depois do build; `git check-ignore` nos
   diretórios gerados; `pnpm turbo run build --filter=@fhir-brasil/site --dry=json`
   lista arquivos de `ig/` nas entradas; `site_source_path` no `ci.yml`.
6. **Colisão interrompe o build.** Se o caminho de um recurso já existir em
   `site/dist`, o script falha dizendo qual, em vez de sobrescrever.
   Prova: mesmo comando do critério 1, teste "colisão interrompe a publicação".
7. **Servidor fiel ao Pages, local.** Com `wrangler pages dev site/dist`:
   uma StructureDefinition e o CodeSystem respondem 200 com
   `application/fhir+json; charset=utf-8`, o pacote e `/ig/` respondem 200, e
   um caminho inexistente sob `/ig/` e sob `/CodeSystem/` responde 404.
   Prova: laço de `curl -i` contra o servidor local, saída no PR.
8. **Checagens do repositório.** `pnpm format:check` e
   `pnpm turbo run build lint typecheck test test:coverage` passam.
9. **Produção, só depois do deploy.** Fica desmarcado no PR:

   ```bash
   for p in /ig/StructureDefinition/br-lab-appointment \
            /ig/StructureDefinition/payment-link \
            /CodeSystem/lab-access-scope \
            /ig/package.tgz /ig/ /ig/nao-existe /CodeSystem/nao-existe; do
     curl -s -o /dev/null -w "%{http_code} %{content_type} $p\n" "https://fhir-brasil.dev.br$p"
   done
   ```

   Esperado: 200 com `application/fhir+json; charset=utf-8` nos três primeiros,
   200 no pacote e no índice, 404 nos dois últimos.

## Decisões

- **Um script, chamado pelo build do site.** `ig/scripts/build-site-artifacts.js`
  compila com o SUSHI, chama o `build-package-tgz.js` que já existe e grava em
  `site/dist`. O `build` do site passa a ser `tsc && vite build && node ../ig/scripts/build-site-artifacts.js`.
  Sem dependência nova.
- **Arquivo sem extensão no caminho da URL.** O recurso de
  `.../StructureDefinition/br-patient` vira o arquivo
  `site/dist/ig/StructureDefinition/br-patient`, e o tipo vem do `_headers`.
- **Regras de `_headers` escritas à mão** em `site/public/_headers`, uma por
  diretório servido. O teste falha se o SUSHI passar a emitir um recurso em
  diretório sem regra.
- **404 por diretório.** O script grava um `404.html` em `/ig/` (HTML) e um em
  cada diretório de recurso. Nos diretórios de recurso o conteúdo é um
  `OperationOutcome` em JSON, porque a regra de `Content-Type` daquele
  diretório também vale para a resposta 404. O resto do site continua como
  está.
- **Teste no pacote do site.** `site` ganha o script `test` (vitest, já
  instalado na raiz), e o `turbo.json` faz esse teste depender do build do
  site. O teste lê o que espera de dentro do `package.tgz` publicado, para não
  depender de `ig/output` estar presente.

## Fora de escopo

- Publicar no Simplifier ou no FHIR Package Registry. O `_publish-ig.yml`
  fica como está.
- Fazer deploy ou merge.
- Site HTML completo do IG (IG Publisher).
- Negociação de conteúdo (`Accept`), XML, caminhos com versão
  (`.../br-patient|0.9.0`) e a `.index.json` fora do pacote.
- Servir o `CodeSystem-cid-10`, cuja `url` é de `hl7.org`.
- Devolver 404 nos demais caminhos desconhecidos do site (fora de `/ig/` e dos
  diretórios de recurso) e remover a regra morta do `_redirects`.
- Cache do `~/.fhir` no CI. O SUSHI baixa o `hl7.fhir.r4.core` a cada build.

## Situação

Implementado. Critérios 1 a 8 conferidos, com a evidência na descrição do PR.
O critério 9 depende do deploy.

## [0.10.1](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.10.0...v0.10.1) (2026-04-18)

### Bug Fixes

- **core:** auditoria clínica — faixas, fontes, variantes gestacionais e jejum ([#20](https://github.com/Precisa-Saude/fhir-brasil/issues/20)) ([aaf4b14](https://github.com/Precisa-Saude/fhir-brasil/commit/aaf4b141facbc6b767050fc23ebeded2dede1a25))

## [0.10.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.9.0...v0.10.0) (2026-04-07)

### Features

- **calculators:** adicionar calculadora eAG (PRE-182) ([#19](https://github.com/Precisa-Saude/fhir-brasil/issues/19)) ([c62f5de](https://github.com/Precisa-Saude/fhir-brasil/commit/c62f5de451f3212a7a6453d483475505db686aeb))
- **docs,ci:** preparar publicação do IG no Simplifier (PRE-181) ([#17](https://github.com/Precisa-Saude/fhir-brasil/issues/17)) ([67fbc66](https://github.com/Precisa-Saude/fhir-brasil/commit/67fbc6691f00fbb13d567e64efbb072bcb42fcc3))
- **docs:** adicionar terminologias brasileiras — TUSS, TISS, CID-10, SUS, IBGE, CNES ([#16](https://github.com/Precisa-Saude/fhir-brasil/issues/16)) ([20c0966](https://github.com/Precisa-Saude/fhir-brasil/commit/20c09660cf306710b4dbd86c747f43dd4023ad56))

### Bug Fixes

- **ci:** mover check de SIMPLIFIER_API_KEY para step-level ([#18](https://github.com/Precisa-Saude/fhir-brasil/issues/18)) ([61df4a7](https://github.com/Precisa-Saude/fhir-brasil/commit/61df4a727d8be77c0c35b98618f7fc8083e314eb))

### Documentation

- remover badge FHIR IG do README principal ([72c1f3b](https://github.com/Precisa-Saude/fhir-brasil/commit/72c1f3bec822985f63bcf71ca086c678d245b4e6))
- remover seção de instalação do IG ainda não publicado ([cc8e21a](https://github.com/Precisa-Saude/fhir-brasil/commit/cc8e21acfe22b1f557e8ad114f95b1adc8e8a543))

## [0.9.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.8.0...v0.9.0) (2026-04-07)

### Features

- **core,docs:** expandir unit configs, perfis FHIR e higiene operacional ([#15](https://github.com/Precisa-Saude/fhir-brasil/issues/15)) ([7d1c086](https://github.com/Precisa-Saude/fhir-brasil/commit/7d1c086d6927411724b9092490687faa6f10232e))

## [0.8.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.7.0...v0.8.0) (2026-04-07)

### Features

- **core:** Stage 4 — ADR calculadoras, helpers CPF/CNS, FHIRIdentifier ([#14](https://github.com/Precisa-Saude/fhir-brasil/issues/14)) ([fffe4f5](https://github.com/Precisa-Saude/fhir-brasil/commit/fffe4f5c70db3b82f04afec6996f3cb747563317))

## [0.7.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.6.2...v0.7.0) (2026-04-07)

### Features

- **docs:** Stage 3 — FHIR Implementation Guide com BRLabObservation via SUSHI ([#13](https://github.com/Precisa-Saude/fhir-brasil/issues/13)) ([55ddb18](https://github.com/Precisa-Saude/fhir-brasil/commit/55ddb186cf24594d7a34b4589750f185ce6deeee)), closes [#pattern](https://github.com/Precisa-Saude/fhir-brasil/issues/pattern) [#value](https://github.com/Precisa-Saude/fhir-brasil/issues/value)

## [0.6.2](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.6.1...v0.6.2) (2026-04-07)

### Bug Fixes

- **docs,site:** Stage 1 — reconciliar README, site e metadata com estado atual ([#11](https://github.com/Precisa-Saude/fhir-brasil/issues/11)) ([fbd5223](https://github.com/Precisa-Saude/fhir-brasil/commit/fbd5223c4217aea52d1ddc0999e284265ebd1b45))

### Refactoring

- **rnds:** Stage 2 — fixtures de teste e disclosure de produção ([#12](https://github.com/Precisa-Saude/fhir-brasil/issues/12)) ([f813100](https://github.com/Precisa-Saude/fhir-brasil/commit/f813100e1d22fd88041836b4ba31442f5035fb22))

## [0.6.1](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.6.0...v0.6.1) (2026-04-06)

### Bug Fixes

- **calculators,ocr-utils,rnds:** use workspace:^ for flexible semver range ([278a96d](https://github.com/Precisa-Saude/fhir-brasil/commit/278a96d373c0858e7a7d78447a99ea3b5bc23701))
- **ci:** use pnpm publish to resolve workspace: protocol ([176c571](https://github.com/Precisa-Saude/fhir-brasil/commit/176c5717dda7fdf1d418cc15085ea032528ed411))

### Documentation

- simplificar diagrama da seção Problema no README ([3617bed](https://github.com/Precisa-Saude/fhir-brasil/commit/3617bed91efec9281337d5ed873945bf092405f0))

## [0.6.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.5.1...v0.6.0) (2026-04-06)

### Features

- **docs:** redesenhar landing page com narrativa, grid e tema do landing ([#9](https://github.com/Precisa-Saude/fhir-brasil/issues/9)) ([6fa8e25](https://github.com/Precisa-Saude/fhir-brasil/commit/6fa8e25ef46af2d49416c84b87c02ecad0ad70d2))

### Refactoring

- **core,ocr-utils:** QA, cobertura CLI e conversão de unidades ([#10](https://github.com/Precisa-Saude/fhir-brasil/issues/10)) ([6d0d5c7](https://github.com/Precisa-Saude/fhir-brasil/commit/6d0d5c77078ad3b94dbef007136c0d2fecdaa32c))

### Documentation

- adicionar tabela resumo por publicação ao verificacao-citacoes.md ([0cb41b7](https://github.com/Precisa-Saude/fhir-brasil/commit/0cb41b70ffb1e49f8e022f40c52b432b9d9a3ea9))

## [0.5.1](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.5.0...v0.5.1) (2026-04-04)

### Bug Fixes

- **core:** padronizar resposta JSON dos comandos range e units com definição completa ([1cae8ee](https://github.com/Precisa-Saude/fhir-brasil/commit/1cae8eeade349381b5d224d56873434cc9a2d1c6))

### Documentation

- adicionar seção CLI ao README com exemplos de fhir-bio e fhir-ocr ([d30eb1c](https://github.com/Precisa-Saude/fhir-brasil/commit/d30eb1c7db7b5e29e17fe9c4466ab1d47a109e5b))
- remover seções em inglês e adicionar exemplos JSON à seção CLI ([0df226c](https://github.com/Precisa-Saude/fhir-brasil/commit/0df226c83461a5e23220f8022da2569f7343bb34))

## [0.5.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.4.1...v0.5.0) (2026-04-04)

### Features

- **core,ocr-utils:** adicionar CLI para fhir-bio e fhir-ocr ([#8](https://github.com/Precisa-Saude/fhir-brasil/issues/8)) ([6a92303](https://github.com/Precisa-Saude/fhir-brasil/commit/6a923035087af753d7924b2b330859afc8380df2))

### Documentation

- adicionar narrativa de problema, ecossistema e roadmap ao README ([#7](https://github.com/Precisa-Saude/fhir-brasil/issues/7)) ([74b758f](https://github.com/Precisa-Saude/fhir-brasil/commit/74b758f378f613def5e7f10835db6ad70a54504d))

### CI/CD

- restringir detecção de alterações no release para packages/ ([bc58967](https://github.com/Precisa-Saude/fhir-brasil/commit/bc5896700b16a01e8226c3fc0677574cc351a672))

## [0.4.1](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.4.0...v0.4.1) (2026-04-02)

### Bug Fixes

- **ci:** ignorar release em alterações apenas do site e tolerar versões já publicadas ([01f589d](https://github.com/Precisa-Saude/fhir-brasil/commit/01f589da249295b1e187cbc2339403e12ef14d2b))

## [0.4.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.3.1...v0.4.0) (2026-04-02)

### Features

- **docs:** adicionar links externos para LOINC, UCUM, SBPC/ML e RNDS nos cards de features ([7dabe4a](https://github.com/Precisa-Saude/fhir-brasil/commit/7dabe4ae7f9fa57a1019add73d57eb9496251791))

## [0.3.1](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.3.0...v0.3.1) (2026-04-01)

### Bug Fixes

- **ci:** unificar CI e publish em workflow único ([#6](https://github.com/Precisa-Saude/fhir-brasil/issues/6)) ([bb866e4](https://github.com/Precisa-Saude/fhir-brasil/commit/bb866e4e6948e95ed316da302e2bf6f1dedfe821))

## [0.3.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.2.0...v0.3.0) (2026-04-01)

### Features

- **rnds:** adicionar cliente HTTP para a RNDS ([#5](https://github.com/Precisa-Saude/fhir-brasil/issues/5)) ([225bea8](https://github.com/Precisa-Saude/fhir-brasil/commit/225bea8db1b580e849104f4d6f280b2ca2632a61))

### Documentation

- atualizar contagem de biomarcadores para 200+ em toda a documentação ([0489872](https://github.com/Precisa-Saude/fhir-brasil/commit/04898725b673ddfa1127410dcd0ea85d00f4d493))
- sincronizar fontes de referência e corrigir textos do README ([7a881f1](https://github.com/Precisa-Saude/fhir-brasil/commit/7a881f1906575e1ad892f9e22b4ee56767882b4a))

## [0.2.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.1.8...v0.2.0) (2026-03-30)

### Features

- **core:** adicionar citações bibliográficas ABNT para todas as faixas de referência ([#4](https://github.com/Precisa-Saude/fhir-brasil/issues/4)) ([ea21385](https://github.com/Precisa-Saude/fhir-brasil/commit/ea21385254c4e066d264194d8905f3fc9783665b))
- landing page site ([#1](https://github.com/Precisa-Saude/fhir-brasil/issues/1)) ([b59bd44](https://github.com/Precisa-Saude/fhir-brasil/commit/b59bd4404335b25f29d69541b3e39fc39ebb9fdc))

### Bug Fixes

- **ci:** adicionar workflow_dispatch para deploy manual do site ([#2](https://github.com/Precisa-Saude/fhir-brasil/issues/2)) ([dde5f25](https://github.com/Precisa-Saude/fhir-brasil/commit/dde5f25519ef8c76d348f7497a992830ed178ef1))
- **ci:** atualizar node para 22 no workflow de release (semantic-release requer >=22.14) ([f8a71f2](https://github.com/Precisa-Saude/fhir-brasil/commit/f8a71f23a65fa8604cb4ae1269acd88a9dc2a416))
- **ci:** separar build e deploy do site com artifact passing ([9496e7d](https://github.com/Precisa-Saude/fhir-brasil/commit/9496e7d086573a6ef8f0df927ffab1ff4f6b1f7b))
- **ci:** substituir wrangler-action por npx wrangler direto ([877c71d](https://github.com/Precisa-Saude/fhir-brasil/commit/877c71ddbbe4e13ebae11c4c6d151a28decc3299))
- **ci:** trocar packageManager de npx para pnpm no wrangler-action ([515d4f0](https://github.com/Precisa-Saude/fhir-brasil/commit/515d4f0271261e0a948dc711cb15e89ada854209))
- **ci:** usar npm como packageManager no wrangler-action ([2dd9927](https://github.com/Precisa-Saude/fhir-brasil/commit/2dd992782e3ddc7e90444b16a601fcd1bd255fcd))
- **ci:** use npx for wrangler to avoid pnpm workspace root error ([68ef2db](https://github.com/Precisa-Saude/fhir-brasil/commit/68ef2db33c163ecc4bffe2b388bdf665f01dc02b))
- **core:** corrigir itens da terceira rodada de revisao ([0398fb0](https://github.com/Precisa-Saude/fhir-brasil/commit/0398fb028494179cc12cc6a66117e938afc6ba6c))
- **site:** corrigir layout mobile quebrado ([fdc0320](https://github.com/Precisa-Saude/fhir-brasil/commit/fdc03206ac24dbeaa35cbd337ae868842811aba8))

### CI/CD

- automatizar releases com semantic-release ([260759a](https://github.com/Precisa-Saude/fhir-brasil/commit/260759ae733c637958c5941aaa9ecf53f8b64653))

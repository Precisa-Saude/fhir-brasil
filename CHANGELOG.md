## [0.2.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.1.8...v0.2.0) (2026-03-30)

### Features

* **core:** adicionar citações bibliográficas ABNT para todas as faixas de referência ([#4](https://github.com/Precisa-Saude/fhir-brasil/issues/4)) ([ea21385](https://github.com/Precisa-Saude/fhir-brasil/commit/ea21385254c4e066d264194d8905f3fc9783665b))
* landing page site ([#1](https://github.com/Precisa-Saude/fhir-brasil/issues/1)) ([b59bd44](https://github.com/Precisa-Saude/fhir-brasil/commit/b59bd4404335b25f29d69541b3e39fc39ebb9fdc))

### Bug Fixes

* **ci:** adicionar workflow_dispatch para deploy manual do site ([#2](https://github.com/Precisa-Saude/fhir-brasil/issues/2)) ([dde5f25](https://github.com/Precisa-Saude/fhir-brasil/commit/dde5f25519ef8c76d348f7497a992830ed178ef1))
* **ci:** atualizar node para 22 no workflow de release (semantic-release requer >=22.14) ([f8a71f2](https://github.com/Precisa-Saude/fhir-brasil/commit/f8a71f23a65fa8604cb4ae1269acd88a9dc2a416))
* **ci:** separar build e deploy do site com artifact passing ([9496e7d](https://github.com/Precisa-Saude/fhir-brasil/commit/9496e7d086573a6ef8f0df927ffab1ff4f6b1f7b))
* **ci:** substituir wrangler-action por npx wrangler direto ([877c71d](https://github.com/Precisa-Saude/fhir-brasil/commit/877c71ddbbe4e13ebae11c4c6d151a28decc3299))
* **ci:** trocar packageManager de npx para pnpm no wrangler-action ([515d4f0](https://github.com/Precisa-Saude/fhir-brasil/commit/515d4f0271261e0a948dc711cb15e89ada854209))
* **ci:** usar npm como packageManager no wrangler-action ([2dd9927](https://github.com/Precisa-Saude/fhir-brasil/commit/2dd992782e3ddc7e90444b16a601fcd1bd255fcd))
* **ci:** use npx for wrangler to avoid pnpm workspace root error ([68ef2db](https://github.com/Precisa-Saude/fhir-brasil/commit/68ef2db33c163ecc4bffe2b388bdf665f01dc02b))
* **core:** corrigir itens da terceira rodada de revisao ([0398fb0](https://github.com/Precisa-Saude/fhir-brasil/commit/0398fb028494179cc12cc6a66117e938afc6ba6c))
* **site:** corrigir layout mobile quebrado ([fdc0320](https://github.com/Precisa-Saude/fhir-brasil/commit/fdc03206ac24dbeaa35cbd337ae868842811aba8))

### CI/CD

* automatizar releases com semantic-release ([260759a](https://github.com/Precisa-Saude/fhir-brasil/commit/260759ae733c637958c5941aaa9ecf53f8b64653))

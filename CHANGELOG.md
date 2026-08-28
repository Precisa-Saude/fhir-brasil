## [0.20.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.19.0...v0.20.0) (2026-08-28)

### Features

* **core:** índice de massa muscular e circunferência da panturrilha ([#84](https://github.com/Precisa-Saude/fhir-brasil/issues/84)) ([92438ba](https://github.com/Precisa-Saude/fhir-brasil/commit/92438ba26b20134a4eddfe61810c3af4e8f62a4b)), closes [#83](https://github.com/Precisa-Saude/fhir-brasil/issues/83)

## [0.19.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.18.0...v0.19.0) (2026-08-28)

### Features

* **core:** bioimpedância, dobras cutâneas e antropometria ([#83](https://github.com/Precisa-Saude/fhir-brasil/issues/83)) ([7affc87](https://github.com/Precisa-Saude/fhir-brasil/commit/7affc874166600eb306e81873016bc07bfe38cbd))

## [0.18.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.17.4...v0.18.0) (2026-08-28)

### Features

* **core:** amplia limites de importação para 5000 Observations ([#81](https://github.com/Precisa-Saude/fhir-brasil/issues/81)) ([47cc667](https://github.com/Precisa-Saude/fhir-brasil/commit/47cc6678224318d48c9e698a04e5767baf897dc0))

### Chores

* **ci:** alinha o _release.yml ao template do tooling ([#80](https://github.com/Precisa-Saude/fhir-brasil/issues/80)) ([afb73fe](https://github.com/Precisa-Saude/fhir-brasil/commit/afb73fe057d003ad2d6aeed3baae3a295889b973)), closes [#79](https://github.com/Precisa-Saude/fhir-brasil/issues/79)

## [0.17.4](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.17.3...v0.17.4) (2026-08-13)

### Bug Fixes

* **ci:** guard de release compara desde a última release, não o push ([#79](https://github.com/Precisa-Saude/fhir-brasil/issues/79)) ([ea4127a](https://github.com/Precisa-Saude/fhir-brasil/commit/ea4127a64e98086c271de2eb6d63d17d4060b8d5)), closes [#72](https://github.com/Precisa-Saude/fhir-brasil/issues/72)
* **ci:** não falha quando o Actions não pode abrir PR ([#73](https://github.com/Precisa-Saude/fhir-brasil/issues/73)) ([3c04c81](https://github.com/Precisa-Saude/fhir-brasil/commit/3c04c81bb25c5b8b6d1a230c5eeca7e3bceda08b))
* **ci:** o primeiro snapshot de LOINC era gerado e descartado ([#70](https://github.com/Precisa-Saude/fhir-brasil/issues/70)) ([e6bc632](https://github.com/Precisa-Saude/fhir-brasil/commit/e6bc632820f9915b4e45ad55b7c069d68270fe04))
* **ci:** publish-watch aceita pacote sem tag quando bate com o package.json ([#78](https://github.com/Precisa-Saude/fhir-brasil/issues/78)) ([72bc960](https://github.com/Precisa-Saude/fhir-brasil/commit/72bc9609eade39e3600202b7dbbcaf6cce1d9491)), closes [#48](https://github.com/Precisa-Saude/fhir-brasil/issues/48) [tooling#52](https://github.com/Precisa-Saude/tooling/issues/52)
* **ci:** publish-watch compara a versão do pacote, não a maior tag ([#77](https://github.com/Precisa-Saude/fhir-brasil/issues/77)) ([aff0378](https://github.com/Precisa-Saude/fhir-brasil/commit/aff0378f49fc244b734c06accaa778a1c7289473)), closes [tooling#51](https://github.com/Precisa-Saude/tooling/issues/51)
* **ci:** quebra a mensagem de commit do snapshot em parágrafos ([#71](https://github.com/Precisa-Saude/fhir-brasil/issues/71)) ([1f6fbe0](https://github.com/Precisa-Saude/fhir-brasil/commit/1f6fbe00e15b7d876060cc8d8350bcdeafaed93a))
* **ci:** remove flag inválida que quebrava o publish de recuperação ([#75](https://github.com/Precisa-Saude/fhir-brasil/issues/75)) ([fd831b1](https://github.com/Precisa-Saude/fhir-brasil/commit/fd831b1a98cfa7b64c9f39a8060b72c8673b4f89))
* **core:** troca o código LOINC da LDH, que está desencorajado ([#72](https://github.com/Precisa-Saude/fhir-brasil/issues/72)) ([da54e77](https://github.com/Precisa-Saude/fhir-brasil/commit/da54e77defdddefb114cb6fc04a3b7c149f5409a))

### Chores

* **ci:** sincroniza templates do cli 1.13.1 ([#76](https://github.com/Precisa-Saude/fhir-brasil/issues/76)) ([88beeac](https://github.com/Precisa-Saude/fhir-brasil/commit/88beeacc40bc1ce9e148aa0efeaec1b5d25caf76)), closes [tooling#47](https://github.com/Precisa-Saude/tooling/issues/47) [tooling#48](https://github.com/Precisa-Saude/tooling/issues/48) [tooling#50](https://github.com/Precisa-Saude/tooling/issues/50)
* **core:** atualiza o snapshot de códigos LOINC ([#74](https://github.com/Precisa-Saude/fhir-brasil/issues/74)) ([31ff88e](https://github.com/Precisa-Saude/fhir-brasil/commit/31ff88ec65f713cabd2c11dc37f8b0e877d0165a))

## [0.17.3](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.17.2...v0.17.3) (2026-08-10)

### Bug Fixes

* **core:** corrige três códigos LOINC inválidos ([#69](https://github.com/Precisa-Saude/fhir-brasil/issues/69)) ([52beb4f](https://github.com/Precisa-Saude/fhir-brasil/commit/52beb4f3918d10fd65faa195401a9cf436c1537e))

## [0.17.2](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.17.1...v0.17.2) (2026-08-10)

### Bug Fixes

* **core:** remove a razão ApoCIII/ApoA1, que não tinha fonte ([#68](https://github.com/Precisa-Saude/fhir-brasil/issues/68)) ([b51cdee](https://github.com/Precisa-Saude/fhir-brasil/commit/b51cdeeb9a4ab67eeda685151777434ddd2bc648)), closes [#3](https://github.com/Precisa-Saude/fhir-brasil/issues/3) [#3](https://github.com/Precisa-Saude/fhir-brasil/issues/3)

## [0.17.1](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.17.0...v0.17.1) (2026-08-10)

### Bug Fixes

* **ci:** separa código inexistente de resposta sem display name ([#66](https://github.com/Precisa-Saude/fhir-brasil/issues/66)) ([d622c7a](https://github.com/Precisa-Saude/fhir-brasil/commit/d622c7a34d0550eea159bdbb778efb7f2b59bd47))
* **core:** sobe o teto masculino de CK para o limite populacional ([#67](https://github.com/Precisa-Saude/fhir-brasil/issues/67)) ([9670348](https://github.com/Precisa-Saude/fhir-brasil/commit/9670348ebe84d8b3980912bfe1e33a9a9adb545a)), closes [#3](https://github.com/Precisa-Saude/fhir-brasil/issues/3)

## [0.17.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.16.6...v0.17.0) (2026-08-10)

### Features

* **ci:** confere os códigos LOINC contra a fonte oficial ([#65](https://github.com/Precisa-Saude/fhir-brasil/issues/65)) ([a630361](https://github.com/Precisa-Saude/fhir-brasil/commit/a6303614d9e966687b10bd19c9b329379f7afcdb))

## [0.16.6](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.16.5...v0.16.6) (2026-08-10)

### Bug Fixes

* **ci:** regenera o ValueSet e liga o gerador ao CI ([#64](https://github.com/Precisa-Saude/fhir-brasil/issues/64)) ([a43ea6d](https://github.com/Precisa-Saude/fhir-brasil/commit/a43ea6de2ee4763806c462ead328bdf5584a0662))

## [0.16.5](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.16.4...v0.16.5) (2026-08-10)

### Bug Fixes

* **core:** corrige piso da TFG e canonicaliza unidades ([#63](https://github.com/Precisa-Saude/fhir-brasil/issues/63)) ([3409a16](https://github.com/Precisa-Saude/fhir-brasil/commit/3409a16bd038163281302671d953b7a184a906ec))

### Chores

* **ci:** sincroniza templates e declara divergências deliberadas ([#62](https://github.com/Precisa-Saude/fhir-brasil/issues/62)) ([e62ac6d](https://github.com/Precisa-Saude/fhir-brasil/commit/e62ac6d045ac43940b031bd654691d115fe632a7))

## [0.16.4](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.16.3...v0.16.4) (2026-08-03)

### Bug Fixes

* **ci:** completa o .precisa.json para o doctor voltar a auditar ([#61](https://github.com/Precisa-Saude/fhir-brasil/issues/61)) ([b72e90f](https://github.com/Precisa-Saude/fhir-brasil/commit/b72e90ff53962cbc81801c3b84d463fabe38b4fa)), closes [Precisa-Saude/tooling#42](https://github.com/Precisa-Saude/tooling/issues/42)
* **ocr-utils:** exigir fronteira de token e contexto de valor na ancoragem ([#60](https://github.com/Precisa-Saude/fhir-brasil/issues/60)) ([60313f8](https://github.com/Precisa-Saude/fhir-brasil/commit/60313f8142f3e2ac6fafbd857b677326e35073f9)), closes [#59](https://github.com/Precisa-Saude/fhir-brasil/issues/59) [#59](https://github.com/Precisa-Saude/fhir-brasil/issues/59)

### CI/CD

* atualizar GitHub Actions para o runtime Node 24 ([#57](https://github.com/Precisa-Saude/fhir-brasil/issues/57)) ([ae4f932](https://github.com/Precisa-Saude/fhir-brasil/commit/ae4f932b2fd8ec75d24f101064529b2097c1f22b))

## [0.16.3](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.16.2...v0.16.3) (2026-07-04)

### Bug Fixes

* **core:** alinhar faixas da eAG aos cortes diagnósticos da HbA1c ([#56](https://github.com/Precisa-Saude/fhir-brasil/issues/56)) ([4f1afc7](https://github.com/Precisa-Saude/fhir-brasil/commit/4f1afc718aef37ff451f0a46b65e3f6bc1f686a1))

### Chores

* **config:** remove @precisa-saude/fhir-calculators (extraído para repo próprio) ([#54](https://github.com/Precisa-Saude/fhir-brasil/issues/54)) ([4c9d722](https://github.com/Precisa-Saude/fhir-brasil/commit/4c9d7225b6218a332f9a24d4a3030ee0a9643099))

## [0.16.2](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.16.1...v0.16.2) (2026-06-04)

### Bug Fixes

* **core:** corrige faixa da razão AA/EPA (1–15 sem fonte → 3,7–40,7) ([#53](https://github.com/Precisa-Saude/fhir-brasil/issues/53)) ([bc30ed8](https://github.com/Precisa-Saude/fhir-brasil/commit/bc30ed8b1af1d4ae20da510c57c72ee3e77575f3))

## [0.16.1](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.16.0...v0.16.1) (2026-06-04)

### Bug Fixes

* **core:** Relação PSA livre/total como higher-better ([#52](https://github.com/Precisa-Saude/fhir-brasil/issues/52)) ([77adab2](https://github.com/Precisa-Saude/fhir-brasil/commit/77adab2b99edf82acbc50b8e07319e94a47684e1))

## [0.16.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.15.5...v0.16.0) (2026-06-04)

### Features

* **core:** faixas de atenção (âmbar) — HOMA-IR via warningMax e PSA livre/total via warningMin ([#51](https://github.com/Precisa-Saude/fhir-brasil/issues/51)) ([4313a5d](https://github.com/Precisa-Saude/fhir-brasil/commit/4313a5dcc7be30231ae17d887d62726a30235818))

## [0.15.5](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.15.4...v0.15.5) (2026-06-03)

### Bug Fixes

* **calculators:** corrige unidade da PCR no PhenoAge (mg/L → mg/dL) ([#50](https://github.com/Precisa-Saude/fhir-brasil/issues/50)) ([87ab3d2](https://github.com/Precisa-Saude/fhir-brasil/commit/87ab3d2118169869ea821e28c3980f13b1064423))
* **ci:** sincronizar versão do pacote rnds com o root ([#46](https://github.com/Precisa-Saude/fhir-brasil/issues/46)) ([21c22a5](https://github.com/Precisa-Saude/fhir-brasil/commit/21c22a5c5b1f5efbd5146e1f10b17ddd408d17f0)), closes [#39](https://github.com/Precisa-Saude/fhir-brasil/issues/39) [#39](https://github.com/Precisa-Saude/fhir-brasil/issues/39)

### Chores

* **ci:** publish-watch passa de cron 15min para diário ([#47](https://github.com/Precisa-Saude/fhir-brasil/issues/47)) ([f26bc31](https://github.com/Precisa-Saude/fhir-brasil/commit/f26bc317a67ad36c6825708839bf2fcdd8ca90cf))

## [0.15.4](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.15.3...v0.15.4) (2026-05-19)

### Bug Fixes

* **core:** remove zonas ótimas do D-Dímero e adiciona corte ajustado por idade ([#45](https://github.com/Precisa-Saude/fhir-brasil/issues/45)) ([bc750b4](https://github.com/Precisa-Saude/fhir-brasil/commit/bc750b4280d73e9d485dafce17a842b9b9bf7028)), closes [Precisa-Saude/platform#465-468](https://github.com/Precisa-Saude/platform/issues/465-468)

## [0.15.3](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.15.2...v0.15.3) (2026-05-19)

### Bug Fixes

* **docs:** corrigir exemplos da home + expor source nas faixas ([#44](https://github.com/Precisa-Saude/fhir-brasil/issues/44)) ([daf30b6](https://github.com/Precisa-Saude/fhir-brasil/commit/daf30b643ade5a8c5c466cbe8ed46b8803771af1))

## [0.15.2](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.15.1...v0.15.2) (2026-05-17)

### Bug Fixes

* **core:** corrigir LOINC de Omega3_Total para RBC (99620-7) ([dce8314](https://github.com/Precisa-Saude/fhir-brasil/commit/dce8314a85ec4cd172c994fe360c13d0a4b428e6)), closes [#41](https://github.com/Precisa-Saude/fhir-brasil/issues/41)

## [0.15.1](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.15.0...v0.15.1) (2026-05-17)

### Bug Fixes

* **core:** corrigir faixas clínicas e LOINCs após revisão Gemini 3.1 Pro ([29ef2da](https://github.com/Precisa-Saude/fhir-brasil/commit/29ef2dae6c4f54c8b1ecedfefa4add803921d4eb)), closes [#41](https://github.com/Precisa-Saude/fhir-brasil/issues/41)

## [0.15.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.14.1...v0.15.0) (2026-05-16)

### Features

* **core:** adicionar faixas de referência para DHL/LDH e β-hidroxibutirato ([#40](https://github.com/Precisa-Saude/fhir-brasil/issues/40)) ([6f39b7a](https://github.com/Precisa-Saude/fhir-brasil/commit/6f39b7ac2733de5f55bf0f25f83cc3662b4c7b2b))

### CI/CD

* passar mismatches via env no publish-watch ([#38](https://github.com/Precisa-Saude/fhir-brasil/issues/38)) ([88a67b1](https://github.com/Precisa-Saude/fhir-brasil/commit/88a67b141442fb98289dcda38f6bb3a5bdf255ea))
* pin actions e adicionar tripwire publish-watch (postmortem TanStack) ([#37](https://github.com/Precisa-Saude/fhir-brasil/issues/37)) ([f21c1c5](https://github.com/Precisa-Saude/fhir-brasil/commit/f21c1c56ac4bfc960f02d4bae19b4bf1d27ed14e))

## [0.14.1](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.14.0...v0.14.1) (2026-04-27)

### Bug Fixes

* **core:** adicionar warningMax em VATVolume para 3 faixas no gauge ([#35](https://github.com/Precisa-Saude/fhir-brasil/issues/35)) ([50d4d9c](https://github.com/Precisa-Saude/fhir-brasil/commit/50d4d9ca0fa0510656f1955313111db10ed51d4f))

## [0.14.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.13.0...v0.14.0) (2026-04-27)

### Features

* consumir Header e OpenFooter compartilhados do @precisa-saude/ui no site ([#32](https://github.com/Precisa-Saude/fhir-brasil/issues/32)) ([8b2e5a4](https://github.com/Precisa-Saude/fhir-brasil/commit/8b2e5a49e268684aa3f5340146b1befbab317095))

### Bug Fixes

* **core:** alinhar VATVolume aos limiares do GE Lunar CoreScan ([#34](https://github.com/Precisa-Saude/fhir-brasil/issues/34)) ([15ddaf8](https://github.com/Precisa-Saude/fhir-brasil/commit/15ddaf87f5304488db4c292ee1557d924a720ba5))

### CI/CD

* bump pnpm/action-setup para v5 (Node.js 24) ([#33](https://github.com/Precisa-Saude/fhir-brasil/issues/33)) ([6380659](https://github.com/Precisa-Saude/fhir-brasil/commit/638065929f57570a1f3b89fe971944b631303dc4))

### Chores

* **deps:** bump @precisa-saude/* para ^1.5.0 ([#31](https://github.com/Precisa-Saude/fhir-brasil/issues/31)) ([f761865](https://github.com/Precisa-Saude/fhir-brasil/commit/f7618658f064154350724c08605ab3b3c24acc8c))
* **lint:** remover override local redundante — test max-lines agora no preset compartilhado ([9feba5a](https://github.com/Precisa-Saude/fhir-brasil/commit/9feba5a9786068a99df694d4c26331cd4d6f1e05)), closes [#18](https://github.com/Precisa-Saude/fhir-brasil/issues/18) [#19](https://github.com/Precisa-Saude/fhir-brasil/issues/19)

## [0.13.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.12.0...v0.13.0) (2026-04-22)

### Features

* **rnds:** validar Bundles contra perfis BR* do IG fhir-brasil ([b388039](https://github.com/Precisa-Saude/fhir-brasil/commit/b388039edcd93b75be888ccd46daa738c1d96c53)), closes [#5](https://github.com/Precisa-Saude/fhir-brasil/issues/5)

## [0.12.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.11.0...v0.12.0) (2026-04-22)

### Features

* **ci:** adotar workflows canônicos split + doctor + publish-tag ([27bd465](https://github.com/Precisa-Saude/fhir-brasil/commit/27bd465e52a1ac842843dcb221e509d1a7f7a431))
* consumir @precisa-saude/agent-instructions + worktree-cli ([b49c199](https://github.com/Precisa-Saude/fhir-brasil/commit/b49c1997cbe8a1b415ef2d6b007f1f6d9c2066ef))

### Chores

* alinhar hooks husky, turbo.json e prettierignore ([e14e0a4](https://github.com/Precisa-Saude/fhir-brasil/commit/e14e0a4836384e96502e3aa7be4a34aafd414f29))
* **lint:** overrides para units.ts e testes data-driven ([02f91a5](https://github.com/Precisa-Saude/fhir-brasil/commit/02f91a560f9b4b0122f263e392e2a84bd96739c3))

## [0.11.0](https://github.com/Precisa-Saude/fhir-brasil/compare/v0.10.1...v0.11.0) (2026-04-22)

### Features

- rnds-sandbox + 200 biomarcadores + taxonomia de 10 categorias ([09b0148](https://github.com/Precisa-Saude/fhir-brasil/commit/09b0148dfd27b4578ebff8544a8925afc6b6e89b))

### Bug Fixes

- **ci:** trocar PAT_TOKEN por GitHub App token no Release ([#26](https://github.com/Precisa-Saude/fhir-brasil/issues/26)) ([7fcff27](https://github.com/Precisa-Saude/fhir-brasil/commit/7fcff27c07885bc40dce63d239f961c0303fb13c))
- **core:** realinhar códigos TUSS do BRTUSSProcedimentosLabVS com tabela ANS oficial ([#24](https://github.com/Precisa-Saude/fhir-brasil/issues/24)) ([4c316f2](https://github.com/Precisa-Saude/fhir-brasil/commit/4c316f2c64fc2e80f73b6bad1699f41524c8b5b9))

### Chores

- **deps:** adotar @precisa-saude/ui e @precisa-saude/themes no site ([#22](https://github.com/Precisa-Saude/fhir-brasil/issues/22)) ([0a61d8c](https://github.com/Precisa-Saude/fhir-brasil/commit/0a61d8c534c9d3084d3f4e754acdece41a5de417))
- **deps:** adotar configs compartilhadas [@precisa-saude](https://github.com/precisa-saude) ([#21](https://github.com/Precisa-Saude/fhir-brasil/issues/21)) ([25b487e](https://github.com/Precisa-Saude/fhir-brasil/commit/25b487ed6b89603953bc0adb095fc72e11871502))
- **deps:** sync dotfiles + add pre-push hook ([#25](https://github.com/Precisa-Saude/fhir-brasil/issues/25)) ([819e37e](https://github.com/Precisa-Saude/fhir-brasil/commit/819e37e5af8e76546872ead1eb91499308bdc918))

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

# Specific instructions — fhir-brasil

> This file holds ONLY the rules specific to this repository. The
> shared rules across the precisa-saude ecosystem (tone, git,
> hooks, reviews, worktrees, source verification, test coverage, code
> conventions) live in `@precisa-saude/agent-instructions`.
>
> **Read the shared base online:**
> https://github.com/Precisa-Saude/tooling/blob/main/packages/agent-instructions/AGENTS.md
>
> Claude Code loads both files (shared base + this one) via imports in
> `CLAUDE.md`. Update the base with:
> `pnpm update @precisa-saude/agent-instructions`.

## Overview

Open-source monorepo `fhir-brasil` — a Brazilian FHIR R4 toolkit with
biomarker definitions, reference ranges, OCR utilities, and an RNDS client.
(Clinical calculators were extracted to the standalone
`@precisa-saude/calculadoras-clinicas` package — see ADR 001.)

## Structure

```
packages/
  core/          — FHIR R4 types, biomarker catalogue (10 categorias), reference ranges, converters
  ocr-utils/     — OCR anchoring, extraction contract and validator
  pdf/           — PDF text-layer extraction (external dep: pdfjs-dist)
  rnds/          — HTTP client for RNDS (DATASUS), mTLS auth
  rnds-sandbox/  — Mock local da RNDS para dev/ensino (FHIR R4, cenários sintéticos)
  lab-access/    — Receiver-side client for the Open Labs Brasil consent-based lab access protocol (draft spec, published on npm)
ig/              — FHIR Implementation Guide (SUSHI), compiled by the site build and served at its canonical URLs (in no package registry)
site/            — Public site (Cloudflare Pages)
```

## Commit scopes

Valid scopes: `core`, `ocr-utils`, `pdf`, `rnds`, `rnds-sandbox`,
`lab-access`, `docs`, `ci`, `deps`, `lint`.

## Dependency rules

- `@precisa-saude/fhir` has **zero runtime dependencies** — enforced
- `@precisa-saude/fhir-ocr-utils` depends only on `@precisa-saude/fhir`
- `@precisa-saude/fhir-rnds` depends only on `@precisa-saude/fhir`
- `@precisa-saude/fhir-rnds-sandbox` depends only on `@precisa-saude/fhir`
- `@precisa-saude/fhir-pdf` is an approved exception: it carries `pdfjs-dist`,
  which is why PDF parsing lives in its own package instead of `ocr-utils`
- `@precisa-saude/fhir-lab-access` is the other approved exception: it depends
  on `@precisa-saude/fhir` and on `jose` (JWT, JWK and JWS), and on nothing
  else. The protocol it implements recommends an established JOSE library
  over hand-written signing and verification code
- Any other external runtime dep requires explicit approval

## Publishing a package

`scripts/sync-versions.js` derives the publish list from `packages/*` minus
packages with `"private": true`, and `--check` (the "Lista de publish" CI job)
fails when the `packages:` block in `.github/workflows/ci.yml` differs from it.
A new public package therefore needs three edits together: drop `"private"`
and add `"publishConfig": { "access": "public" }` in its `package.json`, add
it to that `packages:` block, and add it to `publishPackages` in
`.precisa.json`. Every package carries the monorepo version.

`@precisa-saude/fhir-lab-access` implements a draft (Open Labs Brasil 0.x)
and was published while the spec is still 0.x. Its README keeps the draft
warning. A protocol change that breaks the client is a breaking change for
the package, and with the shared version that means a major release of every
package in this monorepo: say so in the PR before it merges.

## Medical data guidelines

- Biomarker definitions include LOINC codes
- Reference ranges cite sources (SBPC/ML, SBC, SBD, etc.)
- Medical disclaimer present in every package README

## Documentation to update

| Change type            | Files to update                  |
| ---------------------- | -------------------------------- |
| New package            | `README.md` (project structure)  |
| New biomarker          | `README.md` (biomarker count)    |
| New calculator         | `README.md`, package README      |
| API changes            | package README, `CONVENTIONS.md` |
| Reference range update | source citation in code          |

## Justified divergences from the shared baseline

- **`eslint.config.js` — no react preset.** The site is linted with the
  base preset only, the same as medbench-brasil. The react preset sets
  `settings.react.version: 'detect'`; eslint-plugin-react 7.37 detects it
  through `context.getFilename()`, which ESLint 10 removed, so every run
  over `site/**` crashed before linting. The crash went unnoticed because
  lint-staged only lints `*.ts`. Restore the preset once
  `@precisa-saude/eslint-config` ships a fix.

## Worktree — specific values

Worktree flow and commands are in the shared base. The canonical config
lives in `package.json` under `"worktree"`. For quick reference:

| Field         | Value                                  |
| ------------- | -------------------------------------- |
| Port registry | `/tmp/fhir-brasil-worktree-ports.json` |
| Main port     | `site=4323`                            |
| Feature base  | `site=4333`, increment 10              |
| pnpm filter   | `@fhir-brasil/site`                    |

Launch a dev server in a feature worktree:

```bash
pnpm exec precisa-worktree dev --detach   # from inside the worktree
```

## Shared tooling maintenance

Local configuration and workflow entrypoints belong to this repository.
Use versioned package/workflow update PRs for shared changes. `precisa sync`
is retired; use `precisa scaffold --only <path>` only to add missing files.
Historical template-divergence notes above describe local requirements;
`ignoreTemplates` is no longer needed to protect these files.

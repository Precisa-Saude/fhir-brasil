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
biomarker definitions, reference ranges, and clinical calculators.

## Structure

```
packages/
  core/          — FHIR R4 types, 200+ biomarkers (10 categorias), reference ranges, converters
  calculators/   — PhenoAge, BrDMRisc, HOMA-IR, VLDL, BMI
  ocr-utils/     — OCR anchoring for biomarker extraction
  rnds/          — HTTP client for RNDS (DATASUS), mTLS auth
  rnds-sandbox/  — Mock local da RNDS para dev/ensino (FHIR R4, cenários sintéticos)
ig/              — FHIR Implementation Guide (SUSHI), published on Simplifier
site/            — Public site (Cloudflare Pages)
```

## Commit scopes

Valid scopes: `core`, `calculators`, `ocr-utils`, `rnds`, `rnds-sandbox`,
`docs`, `ci`, `deps`, `lint`.

## Dependency rules

- `@precisa-saude/fhir` has **zero runtime dependencies** — enforced
- `@precisa-saude/fhir-calculators` depends only on `@precisa-saude/fhir`
- `@precisa-saude/fhir-ocr-utils` depends only on `@precisa-saude/fhir`
- `@precisa-saude/fhir-rnds` depends only on `@precisa-saude/fhir`
- `@precisa-saude/fhir-rnds-sandbox` depends only on `@precisa-saude/fhir`
- Any external runtime dep requires explicit approval

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

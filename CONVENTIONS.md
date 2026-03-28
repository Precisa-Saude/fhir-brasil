# Conventions

## Naming

- **Files**: `kebab-case.ts` (e.g., `reference-ranges.ts`, `unit-converter.ts`)
- **Types/Interfaces**: `PascalCase` (e.g., `BiomarkerDefinition`, `FHIRObservation`)
- **Functions**: `camelCase` (e.g., `getReferenceRange`, `codeToLoinc`)
- **Constants**: `UPPER_SNAKE_CASE` for data maps (e.g., `BIOMARKER_DEFINITIONS`, `UNIT_TO_UCUM`)
- **Biomarker codes**: `PascalCase` with underscores for compound names (e.g., `HbA1c`, `LDL_Peak_Size`, `BodyFatPct`)

## Imports

- Use relative imports within a package (`./biomarkers`)
- Use package imports across packages (`@fhir-brasil/core`)
- Barrel exports in `index.ts` — re-export everything public
- Sub-path exports for tree-shaking (e.g., `@fhir-brasil/core/biomarkers`)

## Errors

- Throw `Error` with descriptive messages for programming errors
- Return `null`/`undefined` for expected "not found" cases
- Validation functions return `{ valid: boolean; errors: string[] }`

## Tests

- Co-located in `src/__tests__/` directory
- File naming: `<module>.test.ts`
- Use `describe` blocks matching the function/module name
- Test edge cases: unknown codes, missing fields, boundary values
- Coverage threshold: 80% (statements, branches, functions, lines)

## Commits

- Format: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`
- Scopes: `core`, `calculators`, `ocr-utils`, `docs`, `ci`
- Keep messages concise, imperative mood

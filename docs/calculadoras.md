# Calculadoras clínicas

> **As calculadoras clínicas foram movidas para um pacote próprio.**

PhenoAge, BrDMrisc e os biomarcadores derivados (HOMA-IR, VLDL, eAG, IMC) —
antes em `@precisa-saude/fhir-calculators` neste monorepo — agora vivem no
pacote standalone **[`@precisa-saude/calculadoras-clinicas`](https://www.npmjs.com/package/@precisa-saude/calculadoras-clinicas)**,
junto com os índices clínicos (FIB-4, APRI, FLI, AIP, Castelli I/II, ASCVD,
TyG, eGFR, SII, NLR).

- **Repositório:** https://github.com/Precisa-Saude/calculadoras-clinicas
- **npm:** https://www.npmjs.com/package/@precisa-saude/calculadoras-clinicas

```bash
npm install @precisa-saude/calculadoras-clinicas
```

```ts
import { phenoage, brdmrisc, computeDerivedBiomarkers } from '@precisa-saude/calculadoras-clinicas';
```

A documentação de uso de cada calculadora está no README do novo repositório.

> O pacote `@precisa-saude/fhir-calculators` foi descontinuado no npm. O motivo
> da extração está registrado no [ADR-001](development/adr/001-calculadoras-no-monorepo.md).

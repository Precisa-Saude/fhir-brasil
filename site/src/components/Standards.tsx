import { useWideGrid } from '@/hooks/useWideGrid';

const STANDARDS = [
  {
    label: 'FHIR R4',
    description: 'HL7 Fast Healthcare Interoperability Resources',
    href: 'https://hl7.org/fhir/R4/',
  },
  {
    label: 'LOINC',
    description: 'Logical Observation Identifiers Names and Codes',
    href: 'https://loinc.org/',
  },
  {
    label: 'SBPC/ML',
    description: 'Sociedade Brasileira de Patologia Clínica',
    href: 'https://www.sbpc.org.br/',
  },
  {
    label: 'UCUM',
    description: 'Unified Code for Units of Measure',
    href: 'https://ucum.org/',
  },
  {
    label: 'Apache-2.0',
    description: 'Licença open-source permissiva',
    href: 'https://www.apache.org/licenses/LICENSE-2.0',
  },
] as const;

const gridStyle = {
  gridTemplateColumns: 'repeat(var(--grid-cols), 1fr)',
  maxWidth: 'var(--grid-max-w)',
  width: '100%',
} as const;

// Map each card to its grid column start position (desktop only)
// Row 1: cols 2-5, 6-9, 10-13 (three cards, 4 cols each)
// Row 2: cols 4-7, 8-11 (two cards, centered)
const COL_STARTS_14 = [2, 6, 10, 4, 8] as const;

export function Standards() {
  const wide = useWideGrid();
  const offset = wide ? 1 : 0;

  return (
    <section className="min-h-[50svh] py-20 sm:py-28">
      <div className="mx-auto flex flex-col gap-4 px-4 md:grid md:px-0" style={gridStyle}>
        <div className="text-center md:col-span-12 md:col-start-2 3xl:col-start-3">
          <h2 className="font-margem text-2xl font-bold tracking-tight text-ps-violet-dark sm:text-3xl">
            Padrões & Conformidade
          </h2>
          <p className="mx-auto mt-3 max-w-xl font-pausa text-base text-ps-violet-dark/60">
            Construído sobre padrões internacionais de interoperabilidade em saúde, adaptado para o
            contexto brasileiro.
          </p>
        </div>

        {STANDARDS.map((standard, i) => (
          <a
            key={standard.label}
            href={standard.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-ps-violet-dark/8 bg-white/60 px-4 text-center outline outline-1 outline-ps-violet-dark/5 backdrop-blur-sm transition-colors hover:border-ps-violet-dark/15 md:col-span-4"
            style={{ gridColumnStart: COL_STARTS_14[i]! + offset }}
          >
            <span className="font-margem text-base font-bold text-ps-violet-dark">
              {standard.label}
            </span>
            <span className="font-pausa text-sm leading-snug text-ps-violet-dark/50">
              {standard.description}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

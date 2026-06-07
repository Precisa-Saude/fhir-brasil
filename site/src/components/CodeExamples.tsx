import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@precisa-saude/ui/primitives';
import { cn } from '@precisa-saude/ui/utils';
import { useEffect, useState } from 'react';

const TABS = [
  {
    label: 'Faixas de Referência',
    code: `import { getReferenceRange, normalizeCode } from '@precisa-saude/fhir'

// Normaliza aliases de código para a forma canônica
const code = normalizeCode('Tiroxina_T4') // "T4Total"

// Faixa personalizada por sexo e idade
const range = getReferenceRange('HDL', {
  biologicalSex: 'F',
  age: 45,
})

console.log(range)
// {
//   min: 50,
//   max: 100,
//   optimalMin: 55,
//   optimalMax: 100,
//   unit: 'mg/dL',
//   source: 'sbc-lipids-2025',
// }`,
  },
  {
    label: 'Converter para FHIR',
    code: `import { labResultToFHIRBundle } from '@precisa-saude/fhir'
import type { LabReportData, LabObservationData, UserProfileData } from '@precisa-saude/fhir'

const report: LabReportData = {
  reportId: 'report-123',
  userId: 'user-456',
  laboratoryName: 'Laboratório Exemplo',
  collectionDate: '2025-03-15T08:00:00.000Z',
  createdAt: '2025-03-15T14:00:00.000Z',
  overallStatus: 'NORMAL',
}

const observations: LabObservationData[] = [
  {
    reportId: 'report-123',
    biomarkerCode: 'Glucose',
    biomarkerName: 'Glicose',
    value: 92,
    unit: 'mg/dL',
    flag: '',
  },
  {
    reportId: 'report-123',
    biomarkerCode: 'HbA1c',
    biomarkerName: 'Hemoglobina Glicada',
    value: 5.4,
    unit: '%',
    flag: '',
  },
]

const profile: UserProfileData = {
  userId: 'user-456',
  name: 'Maria Silva',
  birthDate: '1980-06-15',
  gender: 'female',
}

// Retorna FHIR R4 Bundle completo
const bundle = labResultToFHIRBundle(report, observations, profile)
// → Bundle { Patient, DiagnosticReport, Observation[] }`,
  },
  {
    label: 'Cliente RNDS',
    code: `import { RNDSClient } from '@precisa-saude/fhir-rnds'

const client = new RNDSClient({
  certificate: './certificado.pfx',
  certificatePassword: process.env.RNDS_CERT_PASSWORD!,
  cnes: '1234567',              // CNES do estabelecimento
  cns: '123456789012345',       // CNS do profissional
  environment: 'homologation',  // ou 'production'
})

// Buscar paciente por CPF
const patient = await client.getPatientByCpf('12345678900')
console.log(patient?.name)
// [{ family: 'Silva', given: ['João'] }]

// Buscar estabelecimento por CNES
const org = await client.getOrganizationByCnes('1234567')
console.log(org?.name)
// 'Hospital São Paulo'

// Enviar bundle de resultados laboratoriais
import { labResultToFHIRBundle } from '@precisa-saude/fhir'

const bundle = labResultToFHIRBundle(report, observations, profile)
const result = await client.submitBundle(bundle)`,
  },
  {
    label: 'Ancoragem OCR',
    code: `import { findBiomarkersInText, getMatchedCodes } from '@precisa-saude/fhir-ocr-utils'

// Texto bruto extraído por OCR de um laudo laboratorial
const ocrText = \`
  HEMOGRAMA COMPLETO
  Hemoglobina: 13.5 g/dL
  Hematócrito: 40.2 %
  Leucócitos: 6.800 /mm³
  Plaquetas: 245.000 /mm³

  PERFIL LIPÍDICO
  Colesterol Total: 195 mg/dL
  HDL Colesterol: 52 mg/dL
  LDL Colesterol: 118 mg/dL
  Triglicerídeos: 125 mg/dL
\`

// Detecta biomarcadores no texto — previne alucinação do LLM
const result = findBiomarkersInText(ocrText)

console.log(result.matches.length)       // 8
console.log(result.stats.scanTimeMs)     // ~2ms

// Códigos detectados para restringir a extração do LLM
const codes = getMatchedCodes(result)
// ['HGB', 'HCT', 'WBC', 'PLT', 'CHOL', 'HDL', 'LDL', 'TRIG']

// Referência filtrada para o prompt do LLM
console.log(result.filteredReference)
// → Somente definições dos biomarcadores detectados`,
  },
] as const;

export function CodeExamples() {
  const [activeTab, setActiveTab] = useState(0);
  const [highlightedCode, setHighlightedCode] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function highlight() {
      const { createHighlighterCore } = await import('shiki/core');
      const { createJavaScriptRegexEngine } = await import('shiki/engine/javascript');
      const ts = await import('shiki/langs/typescript.mjs');
      const theme = await import('shiki/themes/dracula.mjs');

      const highlighter = await createHighlighterCore({
        themes: [theme.default],
        langs: [ts.default],
        engine: createJavaScriptRegexEngine(),
      });

      const results = TABS.map((tab) =>
        highlighter.codeToHtml(tab.code, {
          lang: 'typescript',
          theme: 'dracula',
        }),
      );
      if (!cancelled) {
        setHighlightedCode(results);
      }
    }

    highlight();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="exemplos" className="min-h-[50svh] py-20 sm:py-28">
      <div
        className="mx-auto grid gap-4 px-4 md:px-0"
        style={{
          gridTemplateColumns: 'repeat(var(--grid-cols), 1fr)',
          maxWidth: 'var(--grid-max-w)',
          width: '100%',
        }}
      >
        <div className="col-span-full text-center md:col-span-12 md:col-start-2 3xl:col-start-3">
          <h2 className="font-margem text-3xl font-bold tracking-tight text-ps-violet-dark sm:text-4xl">
            Comece em minutos
          </h2>
        </div>
        <p className="col-span-full mb-8 text-center text-pretty font-pausa text-lg text-ps-violet-dark/60 md:col-span-8 md:col-start-4 3xl:col-start-5">
          TypeScript-first, com tipagem completa e autocompletar no editor.
        </p>

        <div className="col-span-full md:col-span-10 md:col-start-3 3xl:col-start-4">
          <div className="mt-8 mb-4 lg:hidden">
            <Select
              value={TABS[activeTab].label}
              onValueChange={(v) => setActiveTab(TABS.findIndex((t) => t.label === v))}
            >
              <SelectTrigger className="w-full border-ps-violet-dark/15 bg-white/80 font-margem text-sm text-ps-violet-dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TABS.map((tab) => (
                  <SelectItem key={tab.label} value={tab.label} className="font-margem text-sm">
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-8 mb-4 hidden justify-center lg:flex">
            <div
              className="relative inline-grid min-w-max rounded-full border border-ps-violet-dark/10 bg-ps-sand/50 p-1"
              role="tablist"
              style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)` }}
            >
              <div
                className="absolute top-1 bottom-1 rounded-full bg-ps-violet-dark transition-all duration-300 ease-out"
                style={{
                  left: `calc(4px + ${activeTab} * ((100% - 8px) / ${TABS.length}))`,
                  width: `calc((100% - 8px) / ${TABS.length})`,
                }}
              />
              {TABS.map((tab, i) => (
                <button
                  key={tab.label}
                  role="tab"
                  aria-selected={activeTab === i}
                  onClick={() => setActiveTab(i)}
                  className={cn(
                    'relative z-10 whitespace-nowrap rounded-full px-4 py-2 font-margem text-sm font-medium transition-colors duration-300',
                    activeTab === i
                      ? 'text-white'
                      : 'text-ps-violet-dark/60 hover:text-ps-violet-dark',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-ps-violet-dark/10 bg-[#282a36]">
            {highlightedCode.length > 0 ? (
              <div
                className="overflow-x-auto p-6 text-sm leading-relaxed [&_pre]:!bg-transparent"
                dangerouslySetInnerHTML={{ __html: highlightedCode[activeTab] }}
              />
            ) : (
              <pre className="overflow-x-auto p-6 text-sm leading-relaxed text-white/80">
                <code>{TABS[activeTab].code}</code>
              </pre>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

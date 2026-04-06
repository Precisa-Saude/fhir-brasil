import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const TABS = [
  {
    label: 'Faixas de Referência',
    code: `import { getReferenceRange, normalizeCode } from '@precisa-saude/fhir'

// Normaliza aliases — "colesterol HDL", "HDL-C" → "HDL"
const code = normalizeCode('colesterol HDL') // "HDL"

// Faixa personalizada por sexo e idade
const range = getReferenceRange('HDL', {
  biologicalSex: 'F',
  age: 45,
})

console.log(range)
// {
//   min: 40,
//   optimalMin: 60,
//   unit: 'mg/dL',
//   source: 'SBC - Atualização da Diretriz de Dislipidemias 2017'
// }`,
  },
  {
    label: 'Converter para FHIR',
    code: `import { labResultToFHIRBundle } from '@precisa-saude/fhir'
import type { LabReportData, LabObservationData, UserProfileData } from '@precisa-saude/fhir'

const report: LabReportData = {
  laboratoryName: 'Laboratório Exemplo',
  reportDate: '2025-03-15',
}

const observations: LabObservationData[] = [
  { code: 'GLU', value: 92, unit: 'mg/dL' },
  { code: 'HBA1C', value: 5.4, unit: '%' },
]

const profile: UserProfileData = {
  name: 'Maria Silva',
  birthDate: '1980-06-15',
  biologicalSex: 'F',
}

// Retorna FHIR R4 Bundle completo
const bundle = labResultToFHIRBundle(report, observations, profile)
// → Bundle { Patient, DiagnosticReport, Observation[] }`,
  },
  {
    label: 'Calcular PhenoAge',
    code: `import { phenoage } from '@precisa-saude/fhir-calculators'

// Conversão automática de unidades brasileiras → SI
const albumin = phenoage.autoConvertToSI('albumin', 4.2, 'g/dL')
const glucose = phenoage.autoConvertToSI('glucose', 95, 'mg/dL')
const creatinine = phenoage.autoConvertToSI('creatinine', 0.9, 'mg/dL')

const result = phenoage.calculatePhenoAge({
  albumin: albumin.value,           // 42 g/L
  alkalinePhosphatase: 65,          // U/L
  chronologicalAge: 45,
  creatinine: creatinine.value,     // 79.56 μmol/L
  crp: 0.5,                         // mg/L
  glucose: glucose.value,           // 5.27 mmol/L
  lymphocytePercent: 30,            // %
  mcv: 88,                          // fL
  rdw: 12.8,                        // %
  wbc: 6.2,                         // 10⁹/L
})

console.log(result.phenoAge)        // 38.2
console.log(result.ageDifference)   // -6.8 (anos mais jovem)`,
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
      <div className="col-span-full md:col-span-10 md:col-start-3 3xl:col-start-4">
        <h2 className="font-margem text-3xl font-bold tracking-tight text-ps-violet-dark sm:text-4xl">
          Comece em minutos
        </h2>
        <p className="mt-3 font-pausa text-lg text-ps-violet-dark/60">
          TypeScript-first, com tipagem completa e autocompletar no editor.
        </p>

        <div className="mt-8 mb-4 flex justify-start overflow-x-auto md:justify-center">
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

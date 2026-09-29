import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@precisa-saude/ui/primitives';
import { cn } from '@precisa-saude/ui/utils';
import type { ThemeRegistration } from 'shiki/core';
import { useEffect, useState } from 'react';

import { TYPE } from '../lib/typography';
import { GridSection } from './brand/GridSection';

// Tema de sintaxe da marca sobre o roxo escuro #463C6D, o mesmo fundo do
// código da /laudos. Todos os tons passam de 4,5:1 (menor: comentário, 5,1:1);
// a lavanda pura #8E8BD8 daria 2,6:1 e foi clareada para #C8C6F2.
const BRAND_THEME: ThemeRegistration = {
  colors: { 'editor.background': '#463C6D', 'editor.foreground': '#F5F3FA' },
  name: 'precisa',
  tokenColors: [
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { fontStyle: 'italic', foreground: '#BDB8D0' },
    },
    {
      scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.control'],
      settings: { foreground: '#C8C6F2' },
    },
    { scope: ['string', 'string.quoted', 'string.template'], settings: { foreground: '#E5D7CA' } },
    { scope: ['constant.numeric', 'constant.language'], settings: { foreground: '#E7B459' } },
    {
      scope: [
        'entity.name.function',
        'support.function',
        'entity.name.type',
        'support.type',
        'entity.name.class',
      ],
      settings: { foreground: '#9EF2E2' },
    },
    {
      scope: ['variable', 'variable.other', 'meta.object-literal.key', 'support.variable'],
      settings: { foreground: '#F5F3FA' },
    },
    { scope: ['punctuation', 'meta.brace'], settings: { foreground: '#D9D5E6' } },
  ],
  type: 'dark',
};

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

      const highlighter = await createHighlighterCore({
        themes: [BRAND_THEME],
        langs: [ts.default],
        engine: createJavaScriptRegexEngine(),
      });

      const results = TABS.map((tab) =>
        highlighter.codeToHtml(tab.code, {
          lang: 'typescript',
          theme: 'precisa',
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
    <GridSection id="exemplos">
      <h2 className={TYPE.sectionTitle}>Comece em minutos</h2>
      <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-pretty text-foreground/75">
        TypeScript-first, com tipagem completa e autocompletar no editor.
      </p>

      <div className="mt-8 mb-4 lg:hidden">
        <Select
          value={TABS[activeTab].label}
          onValueChange={(v) => setActiveTab(TABS.findIndex((t) => t.label === v))}
        >
          <SelectTrigger className="w-full bg-card text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TABS.map((tab) => (
              <SelectItem key={tab.label} className="text-sm" value={tab.label}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-8 mb-4 hidden lg:flex">
        <div
          className="relative inline-grid min-w-max rounded-full bg-card p-1 ring-1 ring-border"
          role="tablist"
          style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)` }}
        >
          <div
            className="absolute top-1 bottom-1 rounded-full bg-primary transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              left: `calc(4px + ${activeTab} * ((100% - 8px) / ${TABS.length}))`,
              width: `calc((100% - 8px) / ${TABS.length})`,
            }}
          />
          {TABS.map((tab, i) => (
            <button
              key={tab.label}
              aria-selected={activeTab === i}
              className={cn(
                'relative z-10 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200',
                activeTab === i
                  ? 'text-primary-foreground'
                  : 'text-foreground/70 hover:text-foreground',
              )}
              role="tab"
              onClick={() => setActiveTab(i)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[0.625rem] border border-ps-violet/40 bg-[#463C6D]">
        {highlightedCode.length > 0 ? (
          <div
            className="overflow-x-auto p-5 pb-6 font-mono text-sm leading-[1.65] [&_pre]:!bg-transparent"
            dangerouslySetInnerHTML={{ __html: highlightedCode[activeTab] }}
          />
        ) : (
          <pre className="overflow-x-auto p-5 pb-6 font-mono text-sm leading-[1.65] text-[#F5F3FA]">
            <code>{TABS[activeTab].code}</code>
          </pre>
        )}
      </div>
    </GridSection>
  );
}

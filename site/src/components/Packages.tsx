import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { TYPE } from '../lib/typography';
import { GridSection } from './brand/GridSection';

interface PackageInfo {
  name: string;
  description: string;
  install: string;
}

const PACKAGES: PackageInfo[] = [
  {
    name: '@precisa-saude/fhir',
    description: 'Core: tipos FHIR, biomarcadores, faixas de referência, conversores',
    install: 'npm i @precisa-saude/fhir',
  },
  {
    name: '@precisa-saude/fhir-ocr-utils',
    description: 'Ancoragem OCR anti-alucinação para extração de biomarcadores',
    install: 'npm i @precisa-saude/fhir-ocr-utils',
  },
  {
    name: '@precisa-saude/fhir-pdf',
    description:
      'Extração da camada de texto de PDFs de laudo laboratorial, para alimentar a ancoragem do fhir-ocr-utils',
    install: 'npm i @precisa-saude/fhir-pdf',
  },
  {
    name: '@precisa-saude/fhir-rnds',
    description: 'Cliente HTTP para a RNDS (DATASUS) — autenticação mTLS, zero deps externas',
    install: 'npm i @precisa-saude/fhir-rnds',
  },
  {
    name: '@precisa-saude/fhir-rnds-sandbox',
    description:
      'Mock local da RNDS (Rede Nacional de Dados em Saúde) — endpoints FHIR R4 com cenários sintéticos para desenvolvimento e ensino',
    install: 'npm i @precisa-saude/fhir-rnds-sandbox',
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail if page isn't focused
    }
  };

  return (
    <>
      <button
        onClick={handleCopy}
        className="rounded-md p-1.5 text-primary/60 transition-colors hover:bg-secondary hover:text-primary"
        aria-label={`Copiar: ${text}`}
      >
        {copied ? (
          <Check aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Copy aria-hidden="true" className="h-3.5 w-3.5" />
        )}
      </button>
      {/* A troca de ícone é só visual; a região viva anuncia a cópia. */}
      <span aria-live="polite" className="sr-only">
        {copied ? `Copiado: ${text}` : ''}
      </span>
    </>
  );
}

export function Packages() {
  return (
    <GridSection id="pacotes" tone="muted">
      <h2 className={TYPE.sectionTitle}>Pacotes</h2>
      <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-pretty text-foreground/75">
        Pacotes modulares — use só o que precisar.
      </p>

      {/* Lista técnica: linhas e divisórias, não cartões (seção 5 do guia). */}
      <ul className="mt-10 border-b">
        {PACKAGES.map((pkg) => (
          <li
            key={pkg.name}
            className="flex flex-col gap-4 border-t py-6 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="min-w-0 flex-1">
              <h3 className="font-mono text-base font-semibold text-primary">{pkg.name}</h3>
              <p className="mt-1 leading-relaxed text-foreground/75">{pkg.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-md bg-card px-3 py-2 font-mono text-sm text-foreground/80 ring-1 ring-border">
              <span>{pkg.install}</span>
              <CopyButton text={pkg.install} />
            </div>
          </li>
        ))}
      </ul>
    </GridSection>
  );
}

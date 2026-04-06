import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { CornerSquares } from './CornerSquares';

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
    name: '@precisa-saude/fhir-calculators',
    description: 'PhenoAge, BrDMrisc, derivados (HOMA-IR, VLDL, IMC)',
    install: 'npm i @precisa-saude/fhir-calculators',
  },
  {
    name: '@precisa-saude/fhir-ocr-utils',
    description: 'Ancoragem OCR anti-alucinação para extração de biomarcadores',
    install: 'npm i @precisa-saude/fhir-ocr-utils',
  },
  {
    name: '@precisa-saude/fhir-rnds',
    description: 'Cliente HTTP para a RNDS (DATASUS) — autenticação mTLS, zero deps externas',
    install: 'npm i @precisa-saude/fhir-rnds',
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
    <button
      onClick={handleCopy}
      className="rounded-md p-1.5 text-ps-violet-dark/40 transition-colors hover:bg-ps-sand hover:text-ps-violet-dark"
      aria-label={`Copiar: ${text}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-ps-mint" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function Packages() {
  return (
    <section id="pacotes" className="relative min-h-[50svh] bg-white/30 py-20 sm:py-28">
      <CornerSquares position="top" />
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
            Pacotes
          </h2>
        </div>
        <p className="col-span-full mb-8 text-center text-pretty font-pausa text-lg text-ps-violet-dark/60 md:col-span-8 md:col-start-4 3xl:col-start-5">
          Quatro pacotes modulares — use só o que precisar.
        </p>

        <div className="col-span-full md:col-span-10 md:col-start-3 3xl:col-start-4">
          <div className="space-y-4">
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.name}
                className="flex flex-col gap-4 rounded-xl border border-ps-violet-dark/8 bg-white/50 p-6 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-mono text-sm font-semibold text-ps-violet-dark">{pkg.name}</h3>
                  <p className="mt-1 font-pausa text-base text-ps-violet-dark/60">{pkg.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 rounded-lg bg-ps-neutral px-3 py-2 font-mono text-xs text-ps-violet-dark/70">
                  <span>{pkg.install}</span>
                  <CopyButton text={pkg.install} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

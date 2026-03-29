import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

const INSTALL_CMD = 'npm install @precisa-saude/fhir';

const TRUST_BADGES = [
  'FHIR R4',
  'LOINC',
  'SBPC/ML',
  'Apache-2.0',
] as const;

const gridStyle = {
  gridTemplateColumns: 'repeat(var(--grid-cols), 1fr)',
  maxWidth: 'var(--grid-max-w)',
  width: '100%',
} as const;

export function Hero() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail if page isn't focused
    }
  };

  return (
    <section className="relative overflow-hidden pt-16">
      {/* Sand gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-ps-sand via-ps-sand/60 to-ps-neutral" />

      <div
        className="relative mx-auto grid gap-4 px-4 py-24 sm:py-32 md:px-0 lg:py-40"
        style={gridStyle}
      >
        <div className="col-span-full text-center md:col-span-12 md:col-start-2">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-ps-violet-dark/15 bg-white/60 px-4 py-1.5 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-ps-mint" />
            <span className="font-margem text-sm font-medium text-ps-violet-dark/70">
              Open-source · TypeScript · Zero deps
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-margem text-4xl font-bold leading-tight tracking-tight text-ps-violet-dark sm:text-5xl lg:text-6xl">
            Toolkit FHIR R4 para o ecossistema de&nbsp;saúde&nbsp;brasileiro
          </h1>

          {/* Subline */}
          <p className="mx-auto mt-6 mb-4 max-w-2xl font-pausa text-xl leading-snug text-ps-violet-dark/70 sm:text-2xl">
            Definições de biomarcadores, faixas de referência e calculadoras clínicas — open-source,
            com códigos LOINC e diretrizes SBPC/ML.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col gap-3" style={{ width: 'calc(4 * var(--col-w) + 3 * 1rem)', margin: '0 auto' }}>
            <button
              onClick={handleCopy}
              className="group flex w-full items-center justify-between rounded-full border border-ps-violet-dark/15 bg-ps-violet-dark px-6 py-3.5 font-mono text-sm text-white/90 transition-all hover:bg-ps-violet-dark/90"
            >
              <span>
                <span className="text-ps-mint/80">$</span> {INSTALL_CMD}
              </span>
              {copied ? (
                <Check className="h-4 w-4 shrink-0 text-ps-mint" />
              ) : (
                <Copy className="h-4 w-4 shrink-0 text-white/40 transition-colors group-hover:text-white/70" />
              )}
            </button>
            <a
              href="https://github.com/Precisa-Saude/fhir-brasil/tree/main/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center rounded-full border border-ps-violet-dark/20 bg-transparent px-6 py-3.5 font-margem text-sm font-medium text-ps-violet-dark transition-colors hover:border-ps-violet-dark hover:bg-ps-violet-dark hover:text-white"
            >
              Ver documentação →
            </a>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {TRUST_BADGES.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-ps-violet-dark/10 bg-white/50 px-3 py-1 font-margem text-xs font-medium text-ps-violet-dark/60 backdrop-blur-sm"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

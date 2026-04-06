import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { CornerSquares } from './CornerSquares';

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
    <section className="relative min-h-[60svh] pt-16">
      <div className="absolute inset-0 bg-primary" />
      <CornerSquares position="bottom" />

      <div
        className="relative z-10 mx-auto grid gap-4 px-4 py-24 sm:py-32 md:px-0 lg:py-40"
        style={gridStyle}
      >
        <div className="col-span-full text-center md:col-span-12 md:col-start-2 3xl:col-start-3">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-ps-mint" />
            <span className="font-margem text-sm font-medium text-primary-foreground/70">
              Open-source · TypeScript · Zero deps
            </span>
          </div>

          <h1 className="font-margem text-4xl font-bold leading-tight tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl">
            Toolkit FHIR R4 para o ecossistema de&nbsp;saúde&nbsp;brasileiro
          </h1>

          <p className="mx-auto mt-6 mb-4 font-pausa text-xl leading-snug text-primary-foreground/70 sm:text-2xl">
            A camada de infraestrutura que conecta dados de saúde fragmentados entre redes pública e
            privada — open-source, com códigos LOINC e diretrizes SBPC/ML.
          </p>

          <div className="mx-auto mt-10 flex w-full max-w-sm flex-col gap-3 md:max-w-none md:w-[calc(4*var(--col-w)+3*1rem)]">
            <button
              onClick={handleCopy}
              className="group flex w-full items-center justify-between rounded-full border border-primary-foreground/15 bg-white/10 px-6 py-3.5 font-mono text-sm text-white/90 transition-all hover:bg-white/20"
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
              className="flex w-full items-center justify-center rounded-full border border-primary-foreground/20 bg-transparent px-6 py-3.5 font-margem text-sm font-medium text-primary-foreground transition-colors hover:border-ps-mint hover:bg-ps-mint hover:text-primary"
            >
              Ver documentação →
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {TRUST_BADGES.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-primary-foreground/10 bg-white/5 px-3 py-1 font-margem text-xs font-medium text-primary-foreground/60 backdrop-blur-sm"
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

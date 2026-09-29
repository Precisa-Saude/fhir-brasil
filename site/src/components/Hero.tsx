import { ArrowRight, Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { TYPE } from '../lib/typography';
import { gridStyle } from './brand/GridSection';
import { SectionBackdrop } from './brand/SectionBackdrop';

const INSTALL_CMD = 'npm install @precisa-saude/fhir';

const TRUST_BADGES = ['FHIR R4', 'LOINC', 'SBPC/ML', 'Apache-2.0'] as const;

// Três colunas cada: os quatro selos ocupam exatamente as 12 colunas úteis.
const BADGE_COLUMNS = [
  'md:col-start-2 3xl:col-start-3',
  'md:col-start-5 3xl:col-start-6',
  'md:col-start-8 3xl:col-start-9',
  'md:col-start-11 3xl:col-start-12',
];

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
    <section className="relative isolate overflow-hidden border-b bg-background pt-16 text-primary">
      <SectionBackdrop opacity={0.85} />
      <div
        className="relative mx-auto grid items-center gap-x-4 gap-y-12 px-4 pt-16 pb-12 md:px-0 lg:min-h-[calc(100svh-4rem-5rem)] lg:pt-20"
        style={gridStyle}
      >
        <div className="col-span-full md:col-span-12 md:col-start-2 lg:col-span-6 lg:col-start-2 lg:pr-8 3xl:col-start-3">
          <p className={`mb-5 ${TYPE.kicker}`}>Código aberto · TypeScript · Zero deps</p>
          <h1 className={`max-w-[19ch] ${TYPE.h1}`}>
            Toolkit FHIR R4 para o ecossistema de{' '}
            <em className="brand-highlight">saúde&nbsp;brasileiro</em>
          </h1>
          <p className="mt-6 mb-8 max-w-[46ch] text-lg leading-relaxed">
            A camada de infraestrutura que conecta dados de saúde fragmentados entre redes pública e
            privada — código aberto, com códigos LOINC e diretrizes SBPC/ML.
          </p>

          <a
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-sm font-medium whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary/90"
            href="https://github.com/Precisa-Saude/fhir-brasil/tree/main/docs"
            rel="noopener noreferrer"
            target="_blank"
          >
            Ver documentação
            <ArrowRight
              aria-hidden="true"
              className="size-[18px] transition-transform duration-200 group-hover:translate-x-1"
            />
          </a>

          {/* Comando de instalação em superfície opaca sobre o fundo, como os
              objetos da /laudos: é o dado que o desenvolvedor copia. */}
          <button
            aria-label={copied ? 'Comando copiado' : `Copiar: ${INSTALL_CMD}`}
            className="group mt-5 flex w-full max-w-md items-center justify-between gap-4 rounded-md bg-white px-4 py-3 font-mono text-sm text-[#30264f] shadow-[0_0_0_1px_#463c6d24,0_6px_16px_#463c6d12] transition-shadow hover:shadow-[0_0_0_1px_#463c6d52,0_6px_16px_#463c6d12]"
            type="button"
            onClick={handleCopy}
          >
            <span className="truncate">
              <span aria-hidden="true" className="text-ps-violet">
                $
              </span>{' '}
              {INSTALL_CMD}
            </span>
            {copied ? (
              <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Copy
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-primary/50 transition-colors group-hover:text-primary"
              />
            )}
          </button>
        </div>
      </div>

      <div className="relative mx-auto grid gap-4 px-4 pb-4 md:px-0" style={gridStyle}>
        {TRUST_BADGES.map((badge, idx) => (
          <span
            key={badge}
            className={`col-span-7 border-t border-primary/20 pt-4 text-sm md:col-span-3 ${BADGE_COLUMNS[idx]}`}
          >
            {badge}
          </span>
        ))}
      </div>
    </section>
  );
}

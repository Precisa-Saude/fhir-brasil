import { ExternalLink, Flame, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { label: 'Exemplos', href: '#exemplos' },
  { label: 'Pacotes', href: '#pacotes' },
  { label: 'Open Source', href: '#open-source' },
] as const;

export function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-ps-violet-dark/95 backdrop-blur-md">
      <div
        className="mx-auto flex h-16 items-center justify-between gap-4 px-4 md:px-0"
        style={{
          maxWidth: 'var(--grid-max-w)',
          width: '100%',
        }}
      >
        {/* Logo */}
        <a href="#" className="inline-flex items-center gap-1.5 font-margem text-xl font-bold tracking-tight text-white">
          <Flame className="h-6 w-6 text-white" />
          fhir-brasil
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-margem text-base font-medium text-white/70 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://github.com/Precisa-Saude/fhir-brasil"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 font-margem text-sm font-medium text-white transition-colors hover:bg-white/25"
          >
            GitHub
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-md p-2 text-white md:hidden"
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          'overflow-hidden border-t border-white/10 bg-ps-violet-dark/95 backdrop-blur-md transition-all duration-200 md:hidden',
          mobileOpen ? 'max-h-64' : 'max-h-0 border-t-0',
        )}
      >
        <div className="flex flex-col gap-4 px-6 py-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="font-margem text-base font-medium text-white/70 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://github.com/Precisa-Saude/fhir-brasil"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-margem text-sm font-medium text-white/70"
          >
            GitHub
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </nav>
  );
}

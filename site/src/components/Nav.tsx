import { Header } from '@precisa-saude/ui';
import { useWideGrid } from '@precisa-saude/ui/hooks';
import { Code2, ExternalLink, Flame, Github, Package } from 'lucide-react';
import { useState } from 'react';

import pkg from '../../../package.json';

const NAV_LINKS = [
  { col: 5, href: '#exemplos', icon: Code2, label: 'Exemplos', span: 2 },
  { col: 7, href: '#pacotes', icon: Package, label: 'Pacotes', span: 2 },
  { col: 9, href: '#open-source', icon: Github, label: 'Código Aberto', span: 3 },
] as const;

const GITHUB_URL = 'https://github.com/Precisa-Saude/fhir-brasil';

const logo = (
  <a
    className="inline-flex h-full items-center gap-1.5 font-margem text-xl font-bold tracking-tight whitespace-nowrap text-white"
    href="#"
  >
    <Flame className="h-6 w-6 shrink-0 text-white" />
    fhir-brasil
  </a>
);

const mobileNavLinkClass =
  'flex w-full items-center gap-3 rounded-md px-3 py-2.5 font-margem text-base text-foreground transition-colors hover:bg-muted';

export function Nav() {
  const [open, setOpen] = useState(false);
  const wide = useWideGrid();
  const offset = wide ? 1 : 0;

  const navItems = (
    <>
      {NAV_LINKS.map((link) => (
        <a
          key={link.href}
          className="hidden h-full items-center justify-center border-b-2 border-transparent font-margem text-base font-medium text-white/70 transition-colors hover:border-white hover:text-white lg:flex"
          href={link.href}
          style={{ gridColumn: `${link.col + offset} / span ${link.span}` }}
        >
          {link.label}
        </a>
      ))}
    </>
  );

  const actions = (
    <a
      className="hidden items-center justify-center gap-1.5 self-center rounded-full bg-white/15 px-4 py-2 font-margem text-sm font-medium text-white transition-colors hover:bg-white/25 lg:inline-flex"
      href={GITHUB_URL}
      rel="noopener noreferrer"
      style={{ gridColumn: `${12 + offset} / span 2` }}
      target="_blank"
    >
      GitHub
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );

  const mobileNavItems = (
    <div className="flex min-h-0 flex-1 flex-col">
      <button
        className="mb-2 flex cursor-pointer justify-center px-3 py-2"
        onClick={() => {
          setOpen(false);
          window.scrollTo({ behavior: 'smooth', top: 0 });
        }}
      >
        <Flame className="size-8 text-primary" />
      </button>
      <div className="mb-2 border-t border-border" />

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
        {NAV_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <a
              key={link.href}
              className={mobileNavLinkClass}
              href={link.href}
              onClick={() => setOpen(false)}
            >
              <Icon className="size-5" />
              {link.label}
            </a>
          );
        })}
      </div>

      <div className="border-t border-border" />
      <div className="mt-auto px-3 pt-4 pb-4">
        <a
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 font-margem text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          href={GITHUB_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          <Github className="size-4" />
          GitHub
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      <div className="border-t border-border" />
      <div
        className="pt-3 pb-6 text-center font-margem text-xs text-muted-foreground"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        v{pkg.version}
      </div>
    </div>
  );

  return (
    <Header
      actions={actions}
      className="border-b border-white/10 bg-ps-violet-dark/95 backdrop-blur-md"
      containerClassName="mx-auto px-4 md:px-0"
      contentClassName="grid h-16 items-center gap-4"
      iconClassName="text-white"
      isMobileMenuOpen={open}
      logo={logo}
      mobileNavItems={mobileNavItems}
      navItems={navItems}
      onToggleMobileMenu={setOpen}
    />
  );
}

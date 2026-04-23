import { Header } from '@precisa-saude/ui';
import { useWideGrid } from '@precisa-saude/ui/hooks';
import { ExternalLink, Flame } from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = [
  { col: 5, href: '#exemplos', label: 'Exemplos', span: 2 },
  { col: 7, href: '#pacotes', label: 'Pacotes', span: 2 },
  { col: 9, href: '#open-source', label: 'Código Aberto', span: 3 },
] as const;

const GITHUB_URL = 'https://github.com/Precisa-Saude/fhir-brasil';

const logo = (
  <a
    className="inline-flex h-full items-center gap-1.5 font-margem text-xl font-bold tracking-tight text-white"
    href="#"
  >
    <Flame className="h-6 w-6 shrink-0 text-white" />
    fhir-brasil
  </a>
);

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
    <div className="flex flex-col gap-4 px-6 py-6">
      {NAV_LINKS.map((link) => (
        <a
          key={link.href}
          className="font-margem text-base font-medium text-foreground/80 transition-colors hover:text-foreground"
          href={link.href}
          onClick={() => setOpen(false)}
        >
          {link.label}
        </a>
      ))}
      <a
        className="inline-flex items-center gap-1.5 font-margem text-sm font-medium text-foreground/80"
        href={GITHUB_URL}
        rel="noopener noreferrer"
        target="_blank"
      >
        GitHub
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
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

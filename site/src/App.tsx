import { GridOverlay } from '@precisa-saude/ui/decorative';

import { CodeExamples } from './components/CodeExamples';
import { Ecosystem } from './components/Ecosystem';
import { Features } from './components/Features';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { Nav } from './components/Nav';
import { OpenSource } from './components/OpenSource';
import { Packages } from './components/Packages';
import { Problem } from './components/Problem';
import { Standards } from './components/Standards';

export default function App() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Features />
        <Ecosystem />
        <CodeExamples />
        <Packages />
        <Standards />
        <OpenSource />
      </main>
      <Footer />
      <GridOverlay enabled={import.meta.env.DEV} />
    </div>
  );
}

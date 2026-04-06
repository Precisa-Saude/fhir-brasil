import { CodeExamples } from './components/CodeExamples';
import { Ecosystem } from './components/Ecosystem';
import { Features } from './components/Features';
import { Footer } from './components/Footer';
import { GridOverlay } from './components/GridOverlay';
import { Hero } from './components/Hero';
import MosaicBg from './components/MosaicBg';
import { Nav } from './components/Nav';
import { OpenSource } from './components/OpenSource';
import { Packages } from './components/Packages';
import { Problem } from './components/Problem';
import { Standards } from './components/Standards';

const MOSAIC_COLORS = ['var(--ps-violet)', 'var(--ps-mint)'];

export default function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <MosaicBg colors={MOSAIC_COLORS} className="bg-primary">
          <Hero />
        </MosaicBg>
        <Problem />
        <MosaicBg colors={MOSAIC_COLORS}>
          <Features />
        </MosaicBg>
        <Ecosystem />
        <MosaicBg colors={MOSAIC_COLORS}>
          <CodeExamples />
        </MosaicBg>
        <Packages />
        <MosaicBg colors={MOSAIC_COLORS}>
          <Standards />
        </MosaicBg>
        <OpenSource />
      </main>
      <Footer />
      <GridOverlay />
    </div>
  );
}

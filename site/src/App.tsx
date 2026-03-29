import { CodeExamples } from './components/CodeExamples';
import { Features } from './components/Features';
import { Footer } from './components/Footer';
import { GridOverlay } from './components/GridOverlay';
import { Hero } from './components/Hero';
import { Nav } from './components/Nav';
import { OpenSource } from './components/OpenSource';
import { Packages } from './components/Packages';
import { Standards } from './components/Standards';

export default function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <Hero />
        <Features />
        <CodeExamples />
        <Packages />
        <Standards />
        <OpenSource />
      </main>
      <Footer />
      <GridOverlay />
    </div>
  );
}

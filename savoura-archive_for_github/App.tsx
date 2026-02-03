
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import MarketplaceLinks from './components/MarketplaceLinks';
import Gallery from './components/Gallery';
import AICurator from './components/AICurator';
import Footer from './components/Footer';

const App: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 selection:bg-zinc-700 selection:text-white">
      <Header scrolled={scrolled} />
      <main>
        <Hero />
        <MarketplaceLinks />
        <Gallery />
        <section id="curator" className="py-24 bg-[#111] border-y border-zinc-900">
           <div className="max-w-7xl mx-auto px-6">
             <AICurator />
           </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default App;

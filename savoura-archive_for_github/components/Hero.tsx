
import React from 'react';
import { ArrowDownRight } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1534126416832-a88fdf2911c2?q=80&w=2070&auto=format&fit=crop" 
          alt="Vintage Archive" 
          className="w-full h-full object-cover opacity-60 grayscale scale-105 hover:scale-100 transition-transform duration-[10s]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#0a0a0a]"></div>
      </div>

      <div className="relative z-10 text-center px-6 max-w-4xl">
        <span className="inline-block text-[11px] uppercase tracking-[0.4em] mb-6 text-zinc-400 animate-pulse">
          Carefully Curated Selection
        </span>
        <h2 className="font-serif text-6xl md:text-8xl lg:text-9xl mb-8 leading-[0.9] tracking-tighter italic">
          Timeless <br /> 
          <span className="not-italic text-zinc-500 font-light">Artifacts.</span>
        </h2>
        <p className="text-lg md:text-xl text-zinc-400 font-light max-w-xl mx-auto mb-12 leading-relaxed">
          Savoura Archive is a dedicated space for rare garments and archival fashion artifacts, curated for the modern connoisseur.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <a 
            href="#marketplaces" 
            className="group relative px-8 py-4 bg-white text-black text-[12px] uppercase tracking-[0.2em] font-semibold overflow-hidden transition-all hover:scale-105 active:scale-95"
          >
            <span className="relative z-10 flex items-center gap-2">
              Explore Shops <ArrowDownRight size={16} />
            </span>
          </a>
          <button className="px-8 py-4 border border-zinc-800 text-zinc-300 text-[12px] uppercase tracking-[0.2em] hover:bg-zinc-900 transition-all active:scale-95">
            About the Archive
          </button>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 text-zinc-500 text-[10px] uppercase tracking-widest">
        <span className="rotate-90 origin-left ml-2">Scroll</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-zinc-500 to-transparent"></div>
      </div>
    </section>
  );
};

export default Hero;

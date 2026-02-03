
import React from 'react';
import { ExternalLink } from 'lucide-react';

const MarketplaceLinks: React.FC = () => {
  return (
    <section id="marketplaces" className="py-32 bg-[#0a0a0a] border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-4 block">Available Platforms</span>
            <h3 className="font-serif text-4xl md:text-5xl mb-8 italic">Direct Acquisition.</h3>
            <p className="text-zinc-400 leading-relaxed mb-10 max-w-md">
              Our inventory is refreshed weekly. Find our complete curated collection across these verified luxury resale platforms.
            </p>
          </div>
          
          <div className="space-y-6">
            <a 
              href="https://www.vinted.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group block p-8 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-500 transition-all duration-500 rounded-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-serif text-2xl italic">Vinted</span>
                <ExternalLink size={18} className="text-zinc-600 group-hover:text-white transition-colors" />
              </div>
              <p className="text-zinc-500 text-sm group-hover:text-zinc-300 transition-colors">Daily drops, casual archives, and street luxury favorites.</p>
            </a>

            <a 
              href="https://www.vestiairecollective.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group block p-8 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-500 transition-all duration-500 rounded-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-serif text-2xl italic">Vestiaire Collective</span>
                <ExternalLink size={18} className="text-zinc-600 group-hover:text-white transition-colors" />
              </div>
              <p className="text-zinc-500 text-sm group-hover:text-zinc-300 transition-colors">Authenticated high-fashion grails and collector pieces.</p>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MarketplaceLinks;

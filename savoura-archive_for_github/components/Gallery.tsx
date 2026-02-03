
import React from 'react';

const items = [
  { id: 1, img: 'https://images.unsplash.com/photo-1445205170230-053b830c6050?q=80&w=2071&auto=format&fit=crop', title: 'Minimalist Overcoat', label: 'Archival Prada' },
  { id: 2, img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop', title: 'Deconstructed Knit', label: 'Margiela Era' },
  { id: 3, img: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=2070&auto=format&fit=crop', title: 'Structured Blouse', label: 'Vintage Celine' },
  { id: 4, img: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1887&auto=format&fit=crop', title: 'Luxury Leather', label: '90s Italian' },
];

const Gallery: React.FC = () => {
  return (
    <section className="py-32 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <h3 className="font-serif text-4xl md:text-5xl italic">Visual Lookbook.</h3>
          <p className="text-zinc-500 text-[11px] uppercase tracking-[0.3em]">Selection 001 — Autumn / Winter</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="group relative aspect-[3/4] overflow-hidden bg-zinc-900 cursor-crosshair">
              <img 
                src={item.img} 
                alt={item.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                <span className="text-[10px] uppercase tracking-widest text-zinc-300 mb-1">{item.label}</span>
                <p className="font-serif text-xl italic">{item.title}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-20 text-center">
          <button className="text-[11px] uppercase tracking-[0.4em] text-zinc-400 hover:text-white transition-colors flex items-center gap-4 mx-auto group">
            <span className="w-12 h-[1px] bg-zinc-800 group-hover:w-20 transition-all"></span>
            View Entire Archive
            <span className="w-12 h-[1px] bg-zinc-800 group-hover:w-20 transition-all"></span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Gallery;

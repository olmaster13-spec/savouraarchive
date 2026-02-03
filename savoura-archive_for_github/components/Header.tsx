
import React from 'react';
import { ShoppingBag, Instagram, Menu } from 'lucide-react';

interface HeaderProps {
  scrolled: boolean;
}

const Header: React.FC<HeaderProps> = ({ scrolled }) => {
  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-black/80 backdrop-blur-md py-4 border-b border-zinc-800' : 'bg-transparent py-8'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <button className="lg:hidden text-zinc-400 hover:text-white transition-colors">
            <Menu size={20} />
          </button>
          <nav className="hidden lg:flex items-center gap-8 text-[11px] uppercase tracking-[0.2em] font-medium text-zinc-400">
            <a href="#" className="hover:text-white transition-colors">Archive</a>
            <a href="#curator" className="hover:text-white transition-colors">Curator</a>
            <a href="#" className="hover:text-white transition-colors">Editorial</a>
          </nav>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <h1 className="font-serif text-2xl md:text-3xl tracking-tighter italic">
            Savoura Archive
          </h1>
        </div>

        <div className="flex items-center gap-6 text-zinc-400">
          <a href="#" className="hover:text-white transition-colors">
             <Instagram size={18} />
          </a>
          <a href="#marketplaces" className="hover:text-white transition-colors flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]">
             <ShoppingBag size={18} />
             <span className="hidden sm:inline">Shop</span>
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;

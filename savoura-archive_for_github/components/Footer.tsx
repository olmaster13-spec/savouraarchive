
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black py-20 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="md:col-span-2">
            <h4 className="font-serif text-3xl italic mb-6">Savoura Archive</h4>
            <p className="text-zinc-500 max-w-sm font-light text-sm leading-relaxed">
              Curating rare garments and artifacts for those who appreciate the narrative behind the thread. Based in the digital realm, shipped worldwide.
            </p>
          </div>
          
          <div>
            <h5 className="text-[11px] uppercase tracking-[0.2em] mb-6 font-semibold">Marketplaces</h5>
            <ul className="space-y-4 text-sm text-zinc-500 font-light">
              <li><a href="#" className="hover:text-white transition-colors">Vinted Profile</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Vestiaire Shop</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Instagram Direct</a></li>
            </ul>
          </div>
          
          <div>
            <h5 className="text-[11px] uppercase tracking-[0.2em] mb-6 font-semibold">Information</h5>
            <ul className="space-y-4 text-sm text-zinc-500 font-light">
              <li><a href="#" className="hover:text-white transition-colors">Authentication</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Shipping Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Sizing Guide</a></li>
            </ul>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-zinc-900 gap-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            © 2024 Savoura Archive. All Rights Reserved.
          </p>
          <div className="flex items-center gap-8 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
             <a href="#" className="hover:text-white">Privacy</a>
             <a href="#" className="hover:text-white">Terms</a>
             <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="hover:text-white">Back to Top</button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

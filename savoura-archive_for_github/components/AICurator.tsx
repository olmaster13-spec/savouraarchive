
import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { getStyleCuratorAdvice } from '../services/geminiService';
import { CuratedAdvice } from '../types';

const AICurator: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<CuratedAdvice | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    const result = await getStyleCuratorAdvice(input);
    setAdvice(result);
    setLoading(false);
  };

  const handleReset = () => {
    setAdvice(null);
    setInput('');
  };

  return (
    <div className="relative">
      <div className="max-w-2xl mx-auto text-center mb-16">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-100 border border-zinc-700">
            <Sparkles size={24} />
          </div>
        </div>
        <h3 className="font-serif text-3xl md:text-4xl italic mb-4">The Digital Curator.</h3>
        <p className="text-zinc-500 font-light">
          Describe your aesthetic or what you're searching for, and our AI curator will suggest the perfect archival direction.
        </p>
      </div>

      {!advice ? (
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto relative group">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., 90s minimalism, distressed denim, structured blazers..."
            className="w-full bg-transparent border-b border-zinc-800 py-6 pr-12 text-lg focus:outline-none focus:border-white transition-colors placeholder:text-zinc-700 font-light"
          />
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-0 bottom-6 text-zinc-500 hover:text-white transition-colors disabled:text-zinc-700"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
          </button>
        </form>
      ) : (
        <div className="max-w-3xl mx-auto bg-zinc-900/30 p-10 md:p-16 border border-zinc-800 rounded-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-8">
            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-2 block">Curation Report</span>
            <p className="font-serif text-2xl italic leading-relaxed text-white">
              "{advice.mood}"
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="md:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-4 block">Curator's Suggestion</span>
              <p className="text-zinc-400 font-light leading-relaxed">
                {advice.suggestion}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-4 block">Key Tags</span>
              <div className="flex flex-wrap gap-2">
                {advice.styleTags.map(tag => (
                  <span key={tag} className="text-[10px] uppercase tracking-wider bg-zinc-800 px-3 py-1 text-zinc-400 border border-zinc-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleReset}
            className="mt-12 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-zinc-600 hover:text-white transition-colors group"
          >
            <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
            New Inquiry
          </button>
        </div>
      )}

      {loading && !advice && (
        <div className="mt-8 text-center text-[10px] uppercase tracking-widest text-zinc-600 animate-pulse">
          Consulting the Archive...
        </div>
      )}
    </div>
  );
};

export default AICurator;

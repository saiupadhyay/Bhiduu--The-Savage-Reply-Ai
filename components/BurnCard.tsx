
import React, { useState } from 'react';
import { ChatMessage, PersonaConfig } from '../types';
import { geminiService } from '../services/geminiService';

interface Props {
  message: ChatMessage;
  personaConfig: PersonaConfig;
  onClose: () => void;
}

const BurnCard: React.FC<Props> = ({ message, personaConfig, onClose }) => {
  const [saved, setSaved] = useState(false);

  const handleDownload = async () => {
    await geminiService.saveBurnCard({
      id: message.id,
      persona: personaConfig.id,
      content: message.content,
      aggression: message.aggression || 3,
    });
    setSaved(true);
    alert("Saved to Burn Cards collection! Take a screenshot and tag #BhiduuAI 🔥");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="relative w-full max-w-sm aspect-[9/16] bg-black border-[12px] border-white/5 rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col p-8 group">
        {/* Decorative Background Elements */}
        <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br ${personaConfig.color} opacity-20 blur-[80px]`}></div>
        <div className="absolute bottom-10 left-10 w-32 h-32 rounded-full bg-white opacity-5 blur-[50px]"></div>

        {/* Branding */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h4 className="bangers text-2xl tracking-widest text-white/90">BHIDUU</h4>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Savage AI</p>
          </div>
          <div className="text-4xl">{personaConfig.icon}</div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-center">
          <i className="fa-solid fa-quote-left text-4xl mb-6 opacity-20"></i>
          <h2 className="text-3xl font-extrabold leading-tight text-white mb-4 tracking-tight">
            {message.content}
          </h2>
          <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-transparent mb-6"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            — {personaConfig.name}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-8 border-t border-white/10 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">Aggression Level</p>
            <p className="text-xs font-black text-white italic">LVL {message.aggression} • MASS</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">Date</p>
             <p className="text-[10px] font-medium text-white opacity-40">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Action Overlay */}
        <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-4 group-hover:translate-y-0">
          <button 
            onClick={handleDownload}
            className="bg-white text-black px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl active:scale-90 transition-all"
          >
            Save Burn Card
          </button>
        </div>
      </div>

      <button 
        onClick={onClose}
        className="absolute top-10 right-10 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
      >
        <i className="fa-solid fa-xmark text-xl"></i>
      </button>
    </div>
  );
};

export default BurnCard;

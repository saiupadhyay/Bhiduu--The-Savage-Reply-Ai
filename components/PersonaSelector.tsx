
import React from 'react';
import { PERSONAS } from '../constants';
import { Persona } from '../types';

interface PersonaSelectorProps {
  selected: Persona;
  onSelect: (persona: Persona) => void;
}

const PersonaSelector: React.FC<PersonaSelectorProps> = ({ selected, onSelect }) => {
  return (
    <div className="flex overflow-x-auto pb-4 pt-2 gap-4 no-scrollbar scroll-smooth">
      {PERSONAS.map((p) => {
        const isActive = selected === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`flex-shrink-0 flex flex-col items-center justify-center p-4 rounded-3xl w-28 h-32 transition-all duration-500 border-2 relative overflow-hidden group ${
              isActive 
                ? `border-white/40 bg-white/10 shadow-2xl scale-105` 
                : 'border-transparent bg-zinc-900/40 hover:bg-zinc-800/60 opacity-60 hover:opacity-100'
            }`}
          >
            {isActive && (
              <div className={`absolute inset-0 bg-gradient-to-br ${p.color} opacity-20 blur-xl animate-pulse`}></div>
            )}
            <span className={`text-4xl mb-3 transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
              {p.icon}
            </span>
            <span className={`text-[11px] font-bold uppercase text-center leading-tight tracking-tighter transition-colors ${isActive ? 'text-white' : 'text-zinc-500'}`}>
              {p.name.split(' ').join('\n')}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default PersonaSelector;

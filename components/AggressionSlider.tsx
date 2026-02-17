
import React from 'react';

interface AggressionSliderProps {
  value: number;
  onChange: (val: number) => void;
}

const AggressionSlider: React.FC<AggressionSliderProps> = ({ value, onChange }) => {
  const labels = ['Chill', 'Confident', 'Sharp', 'Dominant', 'MASS'];
  const colors = [
    'from-emerald-500 to-green-600', 
    'from-amber-400 to-yellow-600', 
    'from-orange-500 to-red-600', 
    'from-red-600 to-rose-700', 
    'from-indigo-600 to-purple-800'
  ];
  
  const activeColorClass = colors[value - 1];

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Aggression: {labels[value - 1]}</label>
        <span className={`text-[9px] font-black text-white px-2 py-0.5 rounded-full bg-gradient-to-r ${activeColorClass}`}>
          LVL {value}
        </span>
      </div>
      <div className="relative h-4 flex items-center">
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white transition-all"
        />
      </div>
    </div>
  );
};

export default AggressionSlider;


import React, { useState, useRef, useEffect } from 'react';
import { Persona, ChatMessage as ChatMessageType, ChatHistories } from './types';
import AggressionSlider from './components/AggressionSlider';
import ChatMessage from './components/ChatMessage';
import { geminiService } from './services/geminiService';
import { PERSONAS } from './constants';

const App: React.FC = () => {
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const [aggressionLevels, setAggressionLevels] = useState<Record<Persona, number>>({
    [Persona.BOLLYWOOD]: 3,
    [Persona.VILLAIN]: 3,
    [Persona.GEN_Z]: 3,
    [Persona.RAP_BATTLE]: 3,
    [Persona.CORPORATE]: 3,
  });
  
  const [histories, setHistories] = useState<ChatHistories>({
    [Persona.BOLLYWOOD]: [],
    [Persona.VILLAIN]: [],
    [Persona.GEN_Z]: [],
    [Persona.RAP_BATTLE]: [],
    [Persona.CORPORATE]: [],
  });

  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Background mood color & effects
  useEffect(() => {
    if (activePersona) {
      const config = PERSONAS.find(p => p.id === activePersona);
      const isMassAggression = aggressionLevels[activePersona] === 5;
      
      const moodColorMap: Record<string, string> = {
        'from-orange-500 to-red-600': isMassAggression ? '#ff2a0099' : '#ff450033',
        'from-gray-700 to-zinc-900': isMassAggression ? '#000000cc' : '#33333333',
        'from-purple-500 to-pink-500': isMassAggression ? '#d419ff99' : '#a855f733',
        'from-yellow-400 to-orange-500': isMassAggression ? '#ff8c0099' : '#eab30833',
        'from-blue-600 to-indigo-700': isMassAggression ? '#004cff99' : '#2563eb33',
      };
      
      const moodColor = config ? moodColorMap[config.color] : '#ff450033';
      document.getElementById('bg-glow')?.style.setProperty('--mood-color', moodColor);
      
      if (isMassAggression) {
        document.body.classList.add('shake-slow');
      } else {
        document.body.classList.remove('shake-slow');
      }
    } else {
      document.getElementById('bg-glow')?.style.setProperty('--mood-color', '#ffffff05');
      document.body.classList.remove('shake-slow');
    }
  }, [activePersona, aggressionLevels]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [histories, isGenerating, activePersona]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating || !activePersona) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    const currentHistory = histories[activePersona];
    const newHistory = [...currentHistory, userMessage];

    setHistories(prev => ({ ...prev, [activePersona]: newHistory }));
    setInput('');
    setIsGenerating(true);

    const reply = await geminiService.generateReply({
      message: input,
      persona: activePersona,
      aggression: aggressionLevels[activePersona],
      history: currentHistory.slice(-5)
    });

    const botMessage: ChatMessageType = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      content: reply,
      timestamp: Date.now(),
      persona: activePersona,
      aggression: aggressionLevels[activePersona]
    };

    setHistories(prev => ({ 
      ...prev, 
      [activePersona]: [...prev[activePersona], botMessage] 
    }));
    setIsGenerating(false);
  };

  const renderInbox = () => (
    <div className="flex flex-col h-full bg-[#050505]">
      <header className="p-6 pt-10 pb-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl bangers tracking-widest text-white neon-glow">BHIDUU</h1>
          <div className="flex gap-4 text-zinc-400">
            <i className="fa-solid fa-fire text-orange-500"></i>
            <i className="fa-solid fa-magnifying-glass hover:text-white cursor-pointer transition-colors"></i>
            <i className="fa-solid fa-ellipsis-vertical hover:text-white cursor-pointer transition-colors"></i>
          </div>
        </div>
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar py-2">
            <span className="px-4 py-1.5 rounded-full bg-emerald-600 text-[10px] font-black uppercase text-white tracking-widest">Savage Chat</span>
            <span className="px-4 py-1.5 rounded-full bg-zinc-800 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Recents</span>
            <span className="px-4 py-1.5 rounded-full bg-zinc-800 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Archives</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-2">
        {PERSONAS.map(p => {
          const history = histories[p.id];
          const lastMsg = history.length > 0 ? history[history.length - 1] : null;
          
          return (
            <div 
              key={p.id}
              onClick={() => setActivePersona(p.id)}
              className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl cursor-pointer transition-all active:scale-95 group"
            >
              <div className={`w-14 h-14 rounded-full bg-gradient-to-tr ${p.color} flex items-center justify-center text-3xl shadow-lg group-hover:scale-105 transition-transform`}>
                {p.icon}
              </div>
              <div className="flex-1 border-b border-white/5 pb-4 h-full">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors">{p.name}</h3>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">
                    {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 line-clamp-1 italic">
                  {lastMsg ? (lastMsg.role === 'user' ? 'You: ' : '') + lastMsg.content : p.tagline}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="p-6 flex justify-center border-t border-white/5 bg-zinc-950/50 backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Bhidu, kiske saath panga lena hai?</p>
      </div>
    </div>
  );

  const renderChat = (personaId: Persona) => {
    const config = PERSONAS.find(p => p.id === personaId)!;
    const history = histories[personaId];
    const isMass = aggressionLevels[personaId] === 5;
    
    return (
      <div className={`flex flex-col h-full relative transition-all duration-700 ${isMass ? 'shadow-[0_0_50px_rgba(255,69,0,0.3)]' : ''}`}>
        {/* Chat Header */}
        <header className="p-4 glass sticky top-0 z-50 flex items-center gap-3">
          <button 
            onClick={() => setActivePersona(null)}
            className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${config.color} flex items-center justify-center text-xl`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white leading-tight">{config.name}</h2>
            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest animate-pulse">Bhidu is active</p>
          </div>
          <div className="flex gap-4 text-zinc-400 text-sm">
            <i className="fa-solid fa-video cursor-not-allowed opacity-10"></i>
            <i className="fa-solid fa-phone cursor-not-allowed opacity-10"></i>
            <i className="fa-solid fa-ellipsis-vertical"></i>
          </div>
        </header>

        {/* Aggression Slider Overlay */}
        <div className={`p-4 bg-zinc-950/80 border-b border-white/5 transition-all duration-500 ${isMass ? 'bg-orange-950/20' : ''}`}>
           <AggressionSlider 
             value={aggressionLevels[personaId]} 
             onChange={(val) => setAggressionLevels(prev => ({ ...prev, [personaId]: val }))} 
           />
        </div>

        {/* Messages */}
        <main ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-24 space-y-2">
          {history.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-20 text-center px-10">
              <span className="text-6xl mb-4">{config.icon}</span>
              <p className="text-sm font-bold uppercase tracking-widest">{config.tagline}</p>
              <p className="text-[10px] mt-2 italic text-zinc-400">Puraani dushmani nikaal lo aaj.</p>
            </div>
          )}
          {history.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isGenerating && (
            <div className="flex justify-start px-2">
              <div className="bg-zinc-900/40 p-4 rounded-3xl rounded-tl-none border border-white/5">
                <div className="flex gap-1 items-center">
                   <span className="text-[9px] font-bold text-zinc-500 uppercase mr-2 tracking-tighter italic">Bhidu is thinking...</span>
                   <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Input */}
        <footer className="absolute bottom-4 left-4 right-4 z-40">
           <div className={`relative glass rounded-full p-1.5 shadow-2xl border-white/10 flex items-center gap-2 transition-all duration-500 ${isMass ? 'ring-2 ring-orange-500/50 shadow-orange-500/20' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-400">
                <i className={`fa-solid ${isMass ? 'fa-fire text-orange-500 animate-pulse' : 'fa-face-smile'}`}></i>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isMass ? "Write something destructive..." : "Bol Bhidu, kya baat hai?"}
                className="flex-1 bg-transparent border-none py-3 text-sm focus:outline-none resize-none no-scrollbar h-11"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isGenerating}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-20 ${
                  isMass ? 'bg-orange-600 shadow-[0_0_15px_rgba(234,88,12,0.6)]' : 'bg-emerald-600'
                }`}
              >
                <i className="fa-solid fa-paper-plane text-xs text-white"></i>
              </button>
           </div>
        </footer>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen max-w-xl mx-auto overflow-hidden shadow-2xl bg-black border-x border-white/5">
      {activePersona ? renderChat(activePersona) : renderInbox()}
    </div>
  );
};

export default App;

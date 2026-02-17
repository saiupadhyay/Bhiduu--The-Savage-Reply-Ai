
import React, { useState } from 'react';
import { ChatMessage as ChatMessageType, Persona } from '../types';
import { geminiService, decodeBase64Audio, playAudio } from '../services/geminiService';

interface Props {
  message: ChatMessageType;
  isLast?: boolean;
}

const ChatMessage: React.FC<Props> = ({ message, isLast }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCookingMeme, setIsCookingMeme] = useState(false);
  const [memeUrl, setMemeUrl] = useState<string | null>(null);
  const isBot = message.role === 'model';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  const handleSpeak = async () => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    const base64 = await geminiService.speakText(
      message.content, 
      message.persona || Persona.BOLLYWOOD,
      message.aggression || 3
    );
    if (base64) {
      const bytes = decodeBase64Audio(base64);
      await playAudio(bytes, () => setIsSpeaking(false));
    } else {
      setIsSpeaking(false);
    }
  };

  const handleCookMeme = async () => {
    if (isCookingMeme || memeUrl) return;
    setIsCookingMeme(true);
    const url = await geminiService.generateMeme(
      message.content,
      message.persona || Persona.BOLLYWOOD
    );
    if (url) {
      setMemeUrl(url);
    }
    setIsCookingMeme(false);
  };

  return (
    <div className={`flex w-full ${isBot ? 'justify-start' : 'justify-end'} mb-6 px-2 animate-in slide-in-from-bottom-4 duration-500 ease-out`}>
      <div className={`max-w-[90%] md:max-w-[80%] relative group ${
        isBot 
          ? 'bg-zinc-900/80 border border-white/5 rounded-3xl rounded-tl-none p-5 shadow-2xl overflow-hidden' 
          : 'bg-gradient-to-br from-zinc-100 to-zinc-300 text-black font-semibold rounded-3xl rounded-tr-none p-4 px-6 shadow-xl'
      }`}>
        {isBot && isSpeaking && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-shimmer"></div>
        )}

        {isBot && (
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {message.persona} • Level {message.aggression}
              </span>
              {isSpeaking && (
                <div className="flex gap-0.5 items-end h-2.5">
                  <div className="w-0.5 bg-emerald-500 animate-[bounce_0.8s_infinite]"></div>
                  <div className="w-0.5 bg-emerald-500 animate-[bounce_1.1s_infinite]"></div>
                  <div className="w-0.5 bg-emerald-500 animate-[bounce_0.9s_infinite]"></div>
                </div>
              )}
            </div>
            <span className="text-[10px] font-medium text-zinc-600">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
        
        <p className={`text-[15px] leading-relaxed whitespace-pre-wrap ${isBot ? 'text-zinc-200' : 'text-zinc-900'}`}>
          {message.content}
        </p>

        {memeUrl && (
          <div className="mt-4 rounded-xl overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95 duration-500">
             <img src={memeUrl} alt="Cooked Meme" className="w-full h-auto object-cover" />
             <div className="bg-black/60 p-2 text-[10px] text-center font-bold uppercase tracking-widest text-zinc-400">
               🔥 Bhidu Cooked Fresh
             </div>
          </div>
        )}
        
        {isBot && (
          <div className="flex flex-wrap items-center gap-2 mt-4 opacity-40 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={handleCopy}
              className="text-[10px] flex items-center gap-2 text-zinc-400 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-full border border-white/5"
            >
              <i className="fa-regular fa-copy"></i>
              <span>Copy</span>
            </button>
            <button 
              onClick={handleSpeak}
              disabled={isSpeaking}
              className={`text-[10px] flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border border-white/5 ${
                isSpeaking 
                  ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' 
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <i className={`fa-solid ${isSpeaking ? 'fa-waveform-lines animate-pulse' : 'fa-volume-high'}`}></i>
              <span>{isSpeaking ? 'Listening...' : 'Voice'}</span>
            </button>
            {!memeUrl && (
               <button 
                 onClick={handleCookMeme}
                 disabled={isCookingMeme}
                 className={`text-[10px] flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border border-white/5 ${
                   isCookingMeme 
                     ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' 
                     : 'bg-white/5 text-zinc-400 hover:text-orange-400'
                 }`}
               >
                 <i className={`fa-solid ${isCookingMeme ? 'fa-fire-burner animate-bounce' : 'fa-wand-magic-sparkles'}`}></i>
                 <span>{isCookingMeme ? 'Cooking...' : 'Cook Meme'}</span>
               </button>
            )}
          </div>
        )}
        
        {!isBot && (
           <span className="absolute bottom-[-18px] right-2 text-[10px] font-bold text-zinc-600 uppercase">
             You
           </span>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;

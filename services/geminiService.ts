import { GoogleGenAI, Modality } from "@google/genai";
import { GenerationParams, Persona, ChatMessage } from "../types";
import { GET_SYSTEM_PROMPT } from "../constants";

const getApiKey = (): string => {
  return (
    import.meta.env.VITE_API_KEY ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' && (process.env?.GEMINI_API_KEY || process.env?.API_KEY)) ||
    ''
  );
};

const getBackendUrl = (): string => {
  return (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
};

const shouldCallBackend = (): boolean => {
  const customUrl = getBackendUrl();
  if (customUrl) return true;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return true; // Local dev with Vite proxy to port 8000
    }
  }
  return false; // Static hosting like Netlify
};

export class BackendApiService {
  private get baseUrl(): string {
    const backend = getBackendUrl();
    return backend ? `${backend}/api` : '/api';
  }

  async generateReply(params: GenerationParams): Promise<string> {
    const { message, persona, aggression, history } = params;

    // 1. If running locally or with a dedicated backend, try the Python server
    if (shouldCallBackend()) {
      try {
        const response = await fetch(`${this.baseUrl}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            persona,
            aggression,
            history: history.map(msg => ({ role: msg.role, content: msg.content }))
          })
        });

        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
          const data = await response.json();
          return data.reply || "I'm literally speechless. That doesn't happen often.";
        }
      } catch (backendError) {
        console.warn("Backend error, falling back to client GenAI:", backendError);
      }
    }

    // 2. Direct client-side Gemini call (used for Netlify static deployment or fallback)
    const apiKey = getApiKey();
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const contents = history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }));
        contents.push({ role: 'user', parts: [{ text: message }] });

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            systemInstruction: GET_SYSTEM_PROMPT(persona, aggression),
            temperature: Math.min(1.3, 0.8 + (aggression * 0.1)),
            topP: 0.95,
          }
        });

        return response.text || "I'm literally speechless. That doesn't happen often.";
      } catch (clientErr) {
        console.error("Client GenAI Error:", clientErr);
        return "Safety filter kicked in. Savage? Yes. Problematic? Never.";
      }
    }

    return "Bhidu, Netlify par GEMINI_API_KEY (ya VITE_API_KEY) set nahi mili! Please Netlify dashboard mein Environment Variables check karo aur re-deploy karo.";
  }

  async speakText(text: string, persona: Persona, aggression: number = 3): Promise<string | null> {
    const cleanText = text.trim();

    // 1. If backend is available, try Python TTS
    if (shouldCallBackend()) {
      try {
        const response = await fetch(`${this.baseUrl}/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanText, persona, aggression })
        });

        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
          const data = await response.json();
          if (data.audio_base64) return data.audio_base64;
        }
      } catch (backendError) {
        console.warn("Backend TTS failed, falling back:", backendError);
      }
    }

    // 2. Direct client-side Gemini TTS
    const apiKey = getApiKey();
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const voiceName = (persona === Persona.BOLLYWOOD || persona === Persona.VILLAIN || persona === Persona.CORPORATE)
          ? 'Charon'
          : 'Puck';

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash-lite-tts",
          contents: [{ parts: [{ text: cleanText }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      } catch (ttsErr) {
        console.warn("Client GenAI TTS unavailable, will fall back to browser speech:", ttsErr);
      }
    }

    return null;
  }

  async generateMeme(text: string, persona: Persona): Promise<string | null> {
    if (shouldCallBackend()) {
      try {
        const response = await fetch(`${this.baseUrl}/meme`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, persona })
        });

        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
          const data = await response.json();
          if (data.image_url) return data.image_url;
        }
      } catch (backendError) {
        console.warn("Backend Meme failed, falling back:", backendError);
      }
    }

    const apiKey = getApiKey();
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Create a funny meme image for this savage roast: "${text}". 
        The style should be bold, cinematic, and relatable to Indian pop culture. 
        Persona of the roaster is ${persona}. 
        Make it look like a viral social media meme card with high-quality 3D characters or expressive faces.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: prompt }] },
          config: { imageConfig: { aspectRatio: "1:1" } }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      } catch (mErr) {
        console.error("Client Meme Error:", mErr);
      }
    }

    return null;
  }

  async getHistory(persona: Persona): Promise<ChatMessage[]> {
    if (!shouldCallBackend()) return [];
    try {
      const response = await fetch(`${this.baseUrl}/history/${encodeURIComponent(persona)}`);
      const contentType = response.headers.get("content-type");
      if (response.ok && contentType && contentType.includes("application/json")) {
        const data = await response.json();
        return (data.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          persona: m.persona as Persona,
          aggression: m.aggression
        }));
      }
      return [];
    } catch {
      return [];
    }
  }

  async clearHistory(persona: Persona): Promise<boolean> {
    if (!shouldCallBackend()) return true;
    try {
      const response = await fetch(`${this.baseUrl}/history/${encodeURIComponent(persona)}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async saveBurnCard(card: { id?: string; persona: Persona; content: string; aggression: number }) {
    if (!shouldCallBackend()) return;
    try {
      await fetch(`${this.baseUrl}/burn-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card)
      });
    } catch {
      // Safe ignore
    }
  }
}

export const geminiService = new BackendApiService();

export const decodeBase64Audio = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const playAudio = async (bytes: Uint8Array, onEnd?: () => void) => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  const dataInt16 = new Int16Array(bytes.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.onended = () => {
    if (onEnd) onEnd();
    ctx.close();
  };
  source.start();
};

export const speakWithBrowser = (
  text: string,
  persona?: Persona,
  aggression: number = 3,
  onEnd?: () => void
) => {
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);

  const voices = window.speechSynthesis.getVoices();
  const indianVoice =
    voices.find(v => v.lang === 'hi-IN') ||
    voices.find(v => v.lang.startsWith('hi')) ||
    voices.find(v => v.lang === 'en-IN') ||
    null;

  if (indianVoice) {
    utterance.voice = indianVoice;
  }
  utterance.lang = indianVoice ? indianVoice.lang : 'hi-IN';

  // Customize pitch and rate according to persona & aggression
  if (persona === Persona.BOLLYWOOD || persona === Persona.VILLAIN) {
    utterance.pitch = 0.8;
    utterance.rate = aggression >= 4 ? 1.05 : 0.95;
  } else if (persona === Persona.GEN_Z) {
    utterance.pitch = 1.15;
    utterance.rate = 1.15;
  } else if (persona === Persona.RAP_BATTLE) {
    utterance.pitch = 1.0;
    utterance.rate = 1.25;
  } else {
    utterance.pitch = 0.95;
    utterance.rate = 1.0;
  }

  utterance.onend = () => {
    if (onEnd) onEnd();
  };
  utterance.onerror = () => {
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
};

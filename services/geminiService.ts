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

const getOpenAiKey = (): string => {
  return (
    import.meta.env.VITE_OPENAI_API_KEY ||
    (typeof process !== 'undefined' && process.env?.VITE_OPENAI_API_KEY) ||
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

    // 1. If OpenAI API key is present, use studio-quality OpenAI TTS (tts-1) with male voices
    const openAiKey = getOpenAiKey();
    if (openAiKey) {
      try {
        const voice = (persona === Persona.RAP_BATTLE || persona === Persona.GEN_Z) ? 'echo' : 'onyx';
        const speed = (persona === Persona.RAP_BATTLE) ? 1.05 : 0.88;
        const res = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'tts-1',
            voice,
            input: cleanText,
            speed
          })
        });

        if (res.ok) {
          const blob = await res.blob();
          const reader = new FileReader();
          return new Promise<string | null>((resolve) => {
            reader.onloadend = () => {
              resolve(reader.result as string); // data:audio/mpeg;base64,...
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        }
      } catch (openAiErr) {
        console.warn("OpenAI TTS failed, trying next provider:", openAiErr);
      }
    }

    // 2. If backend is available, try Python TTS
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

    // 3. Direct client-side Gemini TTS
    const apiKey = getApiKey();
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        let voiceName = 'Charon';
        if (persona === Persona.CORPORATE) {
          voiceName = 'Zephyr'; // Slick, decent corporate tone
        } else if (persona === Persona.RAP_BATTLE || persona === Persona.GEN_Z) {
          voiceName = 'Puck'; // Thin, energetic tapori / youth
        } else {
          voiceName = 'Charon'; // Bollywood hero / villain deep baritone
        }

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

export const playAudio = async (
  bytes: Uint8Array,
  persona?: Persona,
  onEnd?: () => void
) => {
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

  // Custom playback speed & pitch tailored to each character:
  // - Corporate: 0.94 (slick, decent, measured Bangalore tech pace)
  // - Rap Battle: 1.15 (thin, energetic Mumbai tapori flow)
  // - Gen-Z: 1.08 (fast, snarky South Delhi teen)
  // - Villain: 0.82 (chilling, slow theatrical Bollywood villain)
  // - Bollywood Hero: 0.88 (slow, relaxed Jackie Shroff swagger)
  let rate = 0.88;
  if (persona === Persona.CORPORATE) {
    rate = 0.94;
  } else if (persona === Persona.RAP_BATTLE) {
    rate = 1.15;
  } else if (persona === Persona.GEN_Z) {
    rate = 1.08;
  } else if (persona === Persona.VILLAIN) {
    rate = 0.82;
  }
  source.playbackRate.value = rate;

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
  const isCorporateOrGenZ = persona === Persona.CORPORATE || persona === Persona.GEN_Z;

  // For Corporate/South Delhi, prefer English (India) or clean Hindi
  // For Bollywood/Villain/Rap Battle, prefer Hindi (India)
  const preferredVoice = isCorporateOrGenZ
    ? voices.find(v => v.lang === 'en-IN' && !v.name.toLowerCase().includes('female')) ||
      voices.find(v => (v.lang === 'hi-IN' || v.lang.startsWith('hi')) && !v.name.toLowerCase().includes('female')) ||
      voices.find(v => v.lang === 'en-IN') ||
      voices.find(v => v.lang === 'hi-IN')
    : voices.find(v => (v.lang === 'hi-IN' || v.lang.startsWith('hi')) && !v.name.toLowerCase().includes('female')) ||
      voices.find(v => v.lang === 'hi-IN') ||
      voices.find(v => v.lang === 'en-IN');

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  utterance.lang = preferredVoice ? preferredVoice.lang : (isCorporateOrGenZ ? 'en-IN' : 'hi-IN');

  // Pitch and speed tailored to each character:
  if (persona === Persona.CORPORATE) {
    // Bangalore tech executive: slick, decent, mid-tone, steady pace
    utterance.pitch = 0.95;
    utterance.rate = 0.90;
  } else if (persona === Persona.RAP_BATTLE) {
    // Mumbai gully rap battle: full tapori, thin voice, rapid delivery
    utterance.pitch = 1.25;
    utterance.rate = 1.18;
  } else if (persona === Persona.GEN_Z) {
    // South Delhi kid: snarky, high-energy, animated teen accent
    utterance.pitch = 1.15;
    utterance.rate = 1.08;
  } else if (persona === Persona.VILLAIN) {
    // Bollywood villain actor: theatrical, deep menacing bass, slow chilling delivery
    utterance.pitch = 0.65;
    utterance.rate = 0.80;
  } else {
    // Bollywood Hero (Jackie Shroff): deep husky baritone, slow Bambaiya swagger
    utterance.pitch = 0.72;
    utterance.rate = 0.85;
  }

  utterance.onend = () => {
    if (onEnd) onEnd();
  };
  utterance.onerror = () => {
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
};

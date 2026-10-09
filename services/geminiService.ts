
import { GenerationParams, Persona, ChatMessage } from "../types";

export class BackendApiService {
  private baseUrl = '/api';

  async generateReply(params: GenerationParams): Promise<string> {
    const { message, persona, aggression, history } = params;
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

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      return data.reply || "I'm literally speechless. That doesn't happen often.";
    } catch (error) {
      console.error("Backend API Error:", error);
      return "Safety filter ya network error ho gaya bhidu! Check if Python backend is running.";
    }
  }

  async speakText(text: string, persona: Persona, aggression: number = 3): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona, aggression })
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.audio_base64 || null;
    } catch (e) {
      console.error("TTS API Error", e);
      return null;
    }
  }

  async generateMeme(text: string, persona: Persona): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/meme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona })
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.image_url || null;
    } catch (error) {
      console.error("Meme API Error:", error);
      return null;
    }
  }

  async getHistory(persona: Persona): Promise<ChatMessage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/history/${encodeURIComponent(persona)}`);
      if (!response.ok) return [];
      const data = await response.json();
      return (data.messages || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        persona: m.persona as Persona,
        aggression: m.aggression
      }));
    } catch (e) {
      console.error("Get History Error", e);
      return [];
    }
  }

  async clearHistory(persona: Persona): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/history/${encodeURIComponent(persona)}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (e) {
      console.error("Clear History Error", e);
      return false;
    }
  }

  async saveBurnCard(card: { id?: string; persona: Persona; content: string; aggression: number }) {
    try {
      await fetch(`${this.baseUrl}/burn-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card)
      });
    } catch (e) {
      console.error("Save Burn Card Error", e);
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

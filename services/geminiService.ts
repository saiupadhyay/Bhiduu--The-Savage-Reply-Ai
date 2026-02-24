
import { GoogleGenAI, Modality } from "@google/genai";
import { GenerationParams, Persona } from "../types";
import { GET_SYSTEM_PROMPT } from "../constants";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  }

  async generateReply(params: GenerationParams) {
    const { message, persona, aggression, history } = params;
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents,
        config: {
          systemInstruction: GET_SYSTEM_PROMPT(persona, aggression),
          temperature: 0.8 + (aggression * 0.1),
          topP: 0.95,
        }
      });

      return response.text || "I'm literally speechless. That doesn't happen often.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Safety filter kicked in. Savage? Yes. Problematic? Never.";
    }
  }

  async speakText(text: string, persona: Persona, aggression: number = 3) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Puck';
    let styleContext = '';
    
    const speed = aggression <= 2 
      ? 'with a confident, medium-paced Indian swagger' 
      : aggression >= 4 
        ? 'fast-paced, high energy, and extremely loud' 
        : 'at a lively, rhythmic medium pace';

    const intensity = aggression >= 4 
      ? 'with heavy vocal fry and aggressive dominance' 
      : 'with a sharp, witty, and slightly mocking street-smart tone';

    switch (persona) {
      case Persona.BOLLYWOOD:
        voiceName = 'Fenrir';
        styleContext = `as a Mumbaikar male with a thick, heavy "Bambaiya" local accent. Use a deep, gravelly voice like Jackie Shroff. Speak ${speed}, ${intensity}. Start with a short vocal grunt like "Ae" or "Sunn".`;
        break;
      case Persona.VILLAIN:
        voiceName = 'Fenrir';
        styleContext = `as a cold, authoritative Indian male villain. Use a deep, theatrical 'Khada' accent. Speak ${speed} with a calculated, menacing edge.`;
        break;
      case Persona.CORPORATE:
        voiceName = 'Charon';
        styleContext = `as a South Bombay Indian CEO. High-status, crisp English-mixed-Hindi, but deeply passive-aggressive. Speak ${speed} with a subtle disdain in the voice.`;
        break;
      case Persona.GEN_Z:
        voiceName = 'Puck';
        styleContext = `as a sarcastic Mumbai "Chhapri" or Indori slang-user. High energy, street-smart accent. Speak ${speed} with lots of rhythmic sarcasm.`;
        break;
      case Persona.RAP_BATTLE:
        voiceName = 'Puck';
        styleContext = `as a hard-hitting Desi gully rapper. Use a rhythmic, aggressive Mumbai street accent. Speak ${speed} with sharp, punchy delivery.`;
        break;
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Instruction: You are an Indian man. Speak this in a thick local Indian accent (Mumbai/Indori style). Tone: ${styleContext}. Text: "${text}"` }] }],
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
    } catch (e) {
      console.error("TTS Error", e);
      return null;
    }
  }

  async generateMeme(text: string, persona: Persona) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Create a funny meme image for this savage roast: "${text}". 
    The style should be bold, cinematic, and relatable to Indian pop culture. 
    Persona of the roaster is ${persona}. 
    Make it look like a viral social media meme card with high-quality 3D characters or expressive faces.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Meme Gen Error:", error);
      return null;
    }
  }
}

export const geminiService = new GeminiService();

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

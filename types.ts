
export enum Persona {
  BOLLYWOOD = 'Bollywood Hero',
  VILLAIN = 'Villain Mode',
  GEN_Z = 'Gen-Z Roast',
  RAP_BATTLE = 'Rap Battle',
  CORPORATE = 'Corporate Savage'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  persona?: Persona;
  aggression?: number;
}

export interface PersonaConfig {
  id: Persona;
  name: string;
  description: string;
  icon: string;
  color: string;
  tagline: string;
}

export interface GenerationParams {
  message: string;
  persona: Persona;
  aggression: number;
  history: ChatMessage[];
}

export type ChatHistories = Record<Persona, ChatMessage[]>;

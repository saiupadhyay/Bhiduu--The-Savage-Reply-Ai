from typing import List, Optional
from pydantic import BaseModel, Field
from .prompts import Persona

class ChatMessageItem(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    persona: Persona = Persona.BOLLYWOOD
    aggression: int = Field(default=3, ge=1, le=5)
    history: List[ChatMessageItem] = Field(default_factory=list)

class ChatResponse(BaseModel):
    reply: str
    persona: Persona
    aggression: int

class TTSRequest(BaseModel):
    text: str
    persona: Persona = Persona.BOLLYWOOD
    aggression: int = Field(default=3, ge=1, le=5)

class TTSResponse(BaseModel):
    audio_base64: Optional[str] = None
    mime_type: str = "audio/L16;codec=pcm;rate=24000"

class MemeRequest(BaseModel):
    text: str
    persona: Persona = Persona.BOLLYWOOD

class MemeResponse(BaseModel):
    image_url: Optional[str] = None

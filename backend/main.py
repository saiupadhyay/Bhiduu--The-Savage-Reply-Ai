import uuid
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    ChatRequest,
    ChatResponse,
    TTSRequest,
    TTSResponse,
    MemeRequest,
    MemeResponse,
)
from .prompts import Persona
from .services.gemini_service import gemini_service
from .database import (
    init_db,
    save_message,
    get_messages_for_persona,
    clear_persona_messages,
    save_burn_card,
    get_burn_cards,
)

app = FastAPI(
    title="Bhiduu API - The Savage Reply AI",
    description="Python FastAPI backend powering Bhidu-Bot's roasts, TTS, and meme generation",
    version="1.0.0",
)

# Enable CORS for React frontend (Vite default ports: 3000, 5173, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "Bhidu-Bot Python Backend",
        "timestamp": int(time.time() * 1000)
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    # 1. Save incoming user message in DB
    user_msg_id = str(uuid.uuid4())
    save_message(
        msg_id=user_msg_id,
        persona=request.persona.value,
        role="user",
        content=request.message,
        aggression=request.aggression,
    )

    # 2. Convert history to dict
    history_dicts = [
        {"role": item.role, "content": item.content}
        for item in request.history
    ]

    # 3. Generate savage comeback via Gemini Python SDK
    reply = await gemini_service.generate_reply(
        message=request.message,
        persona=request.persona,
        aggression=request.aggression,
        history=history_dicts,
    )

    # 4. Save model response in DB
    bot_msg_id = str(uuid.uuid4())
    save_message(
        msg_id=bot_msg_id,
        persona=request.persona.value,
        role="model",
        content=reply,
        aggression=request.aggression,
    )

    return ChatResponse(
        reply=reply,
        persona=request.persona,
        aggression=request.aggression,
    )

@app.get("/api/history/{persona}")
def get_history(persona: str):
    messages = get_messages_for_persona(persona)
    return {"persona": persona, "messages": messages}

@app.delete("/api/history/{persona}")
def delete_history(persona: str):
    clear_persona_messages(persona)
    return {"status": "cleared", "persona": persona}

@app.post("/api/tts", response_model=TTSResponse)
async def tts_endpoint(request: TTSRequest):
    audio_base64 = await gemini_service.speak_text(
        text=request.text,
        persona=request.persona,
        aggression=request.aggression,
    )
    return TTSResponse(audio_base64=audio_base64)

@app.post("/api/meme", response_model=MemeResponse)
async def meme_endpoint(request: MemeRequest):
    image_url = await gemini_service.generate_meme(
        text=request.text,
        persona=request.persona,
    )
    return MemeResponse(image_url=image_url)

@app.post("/api/burn-cards")
def save_burn_card_endpoint(card: dict):
    card_id = card.get("id", str(uuid.uuid4()))
    save_burn_card(
        card_id=card_id,
        persona=card.get("persona", Persona.BOLLYWOOD.value),
        content=card.get("content", ""),
        aggression=card.get("aggression", 3),
    )
    return {"status": "saved", "card_id": card_id}

@app.get("/api/burn-cards")
def get_burn_cards_endpoint():
    cards = get_burn_cards()
    return {"burn_cards": cards}

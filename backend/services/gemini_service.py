import os
import base64
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

from ..prompts import Persona, get_system_prompt
from ..database import get_cached_audio, save_cached_audio

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")
load_dotenv(Path(__file__).parent.parent.parent / ".env.local")

api_key = (
    os.getenv("GEMINI_API_KEY") or
    os.getenv("API_KEY") or
    os.getenv("VITE_API_KEY") or
    os.getenv("VITE_OPENAI_API_KEY")
)

class GeminiService:
    def __init__(self):
        self.client = genai.Client(api_key=api_key)

    async def generate_reply(
        self,
        message: str,
        persona: Persona,
        aggression: int,
        history: List[Dict[str, str]]
    ) -> str:
        contents = []
        for msg in history:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg.get("content", "")}]
            })

        contents.append({
            "role": "user",
            "parts": [{"text": message}]
        })

        try:
            temperature = min(1.3, 0.8 + (aggression * 0.1))
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=get_system_prompt(persona, aggression),
                    temperature=temperature,
                    top_p=0.95,
                )
            )

            if response and response.text:
                return response.text.strip()
            return "I'm literally speechless. That doesn't happen often."
        except Exception as error:
            print("Gemini generate_reply error:", error)
            error_str = str(error)
            if "RESOURCE_EXHAUSTED" in error_str or "429" in error_str:
                return "Arre Bhidu, thoda saas lene de! Server garam ho gaya hai (API Rate Limit). 10 second ruk ke bol!"
            return "Safety filter kicked in. Savage? Yes. Problematic? Never."

    async def speak_text(
        self,
        text: str,
        persona: Persona,
        aggression: int = 3
    ) -> Optional[str]:
        # 1. Check SQLite audio cache first (instant response, zero API quota used!)
        clean_text = text.strip()
        cache_key = f"{persona.value}:{aggression}:{clean_text}"
        cached = get_cached_audio(cache_key)
        if cached:
            return cached

        speed = (
            "with a confident, medium-paced Indian swagger"
            if aggression <= 2
            else "fast-paced, high energy, and extremely loud"
            if aggression >= 4
            else "at a lively, rhythmic medium pace"
        )

        intensity = (
            "with heavy vocal fry and aggressive dominance"
            if aggression >= 4
            else "with a sharp, witty, and slightly mocking street-smart tone"
        )

        if persona == Persona.BOLLYWOOD:
            voice_name = "Fenrir"
            style_context = f"as a Mumbaikar male with a thick, heavy Bambaiya local accent like Jackie Shroff. Speak {speed}, {intensity}. Start with a short vocal grunt like 'Ae' or 'Sunn'."
        elif persona == Persona.VILLAIN:
            voice_name = "Fenrir"
            style_context = f"as a cold, authoritative Indian male villain. Deep, theatrical Khada accent. Speak {speed} with a calculated, menacing edge."
        elif persona == Persona.CORPORATE:
            voice_name = "Charon"
            style_context = f"as a Bangalore Indian tech CEO. High-status, crisp Indian English mixed with Hindi, slick and decent corporate tone. Speak {speed}."
        elif persona == Persona.GEN_Z:
            voice_name = "Puck"
            style_context = f"as a sarcastic South Delhi kid. High energy, animated South Delhi teen accent. Speak {speed} with lots of rhythmic sarcasm."
        else:  # RAP_BATTLE
            voice_name = "Puck"
            style_context = f"as a hard-hitting Desi gully rapper. Full tapori, thin voice, in a local rhythmic Mumbai street rap accent. Speak {speed} with sharp, punchy delivery."

        prompt_text = f'Instruction: You are an Indian man. Speak this in a thick local Indian accent. Tone: {style_context}. Text: "{clean_text}"'

        # 2. Multi-model fallback sequence to bypass single-model quota limits
        tts_models = [
            "gemini-2.5-flash-preview-tts",
            "gemini-3.8-flash-lite-tts",
            "gemini-3.1-flash-tts-preview"
        ]

        for model in tts_models:
            try:
                response = self.client.models.generate_content(
                    model=model,
                    contents=prompt_text,
                    config=types.GenerateContentConfig(
                        response_modalities=["AUDIO"],
                        speech_config=types.SpeechConfig(
                            voice_config=types.VoiceConfig(
                                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                    voice_name=voice_name
                                )
                            )
                        )
                    )
                )

                if response and response.candidates:
                    candidate = response.candidates[0]
                    if candidate.content and candidate.content.parts:
                        for part in candidate.content.parts:
                            if part.inline_data and part.inline_data.data:
                                raw_bytes = part.inline_data.data
                                b64 = base64.b64encode(raw_bytes).decode("utf-8")
                                # Save in cache for future instant re-reads
                                save_cached_audio(cache_key, b64)
                                return b64
            except Exception as error:
                print(f"TTS Model {model} failed or rate limited: {error}")
                continue

        return None

    async def generate_meme(
        self,
        text: str,
        persona: Persona
    ) -> Optional[str]:
        prompt = (
            f'Create a funny meme image for this savage roast: "{text}". '
            f'The style should be bold, cinematic, and relatable to Indian pop culture. '
            f'Persona of the roaster is {persona.value}. '
            f'Make it look like a viral social media meme card with high-quality 3D characters or expressive faces.'
        )

        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=prompt,
                config=types.GenerateContentConfig(
                    image_config=types.ImageConfig(aspect_ratio="1:1")
                )
            )

            if response and response.candidates:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if part.inline_data and part.inline_data.data:
                            raw_bytes = part.inline_data.data
                            b64 = base64.b64encode(raw_bytes).decode("utf-8")
                            mime = part.inline_data.mime_type or "image/png"
                            return f"data:{mime};base64,{b64}"
            return None
        except Exception as error:
            print("Gemini generate_meme error:", error)
            return None

gemini_service = GeminiService()

import sqlite3
import os
import time
from pathlib import Path
from typing import List, Dict, Any, Optional

DB_PATH = Path(__file__).parent / "bhidu.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                persona TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                aggression INTEGER DEFAULT 3,
                timestamp INTEGER NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS burn_cards (
                id TEXT PRIMARY KEY,
                persona TEXT NOT NULL,
                content TEXT NOT NULL,
                aggression INTEGER DEFAULT 3,
                created_at INTEGER NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audio_cache (
                cache_key TEXT PRIMARY KEY,
                audio_base64 TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
        """)
        conn.commit()

def save_message(msg_id: str, persona: str, role: str, content: str, aggression: int, timestamp: Optional[int] = None):
    if timestamp is None:
        timestamp = int(time.time() * 1000)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO messages (id, persona, role, content, aggression, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            (msg_id, persona, role, content, aggression, timestamp)
        )
        conn.commit()

def get_messages_for_persona(persona: str, limit: int = 50) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, persona, role, content, aggression, timestamp FROM messages WHERE persona = ? ORDER BY timestamp ASC LIMIT ?",
            (persona, limit)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def clear_persona_messages(persona: str):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE persona = ?", (persona,))
        conn.commit()

def save_burn_card(card_id: str, persona: str, content: str, aggression: int):
    created_at = int(time.time() * 1000)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO burn_cards (id, persona, content, aggression, created_at) VALUES (?, ?, ?, ?, ?)",
            (card_id, persona, content, aggression, created_at)
        )
        conn.commit()

def get_burn_cards(limit: int = 20) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, persona, content, aggression, created_at FROM burn_cards ORDER BY created_at DESC LIMIT ?",
            (limit,)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def get_cached_audio(cache_key: str) -> Optional[str]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT audio_base64 FROM audio_cache WHERE cache_key = ?", (cache_key,))
        row = cursor.fetchone()
        if row:
            return row["audio_base64"]
        return None

def save_cached_audio(cache_key: str, audio_base64: str):
    created_at = int(time.time() * 1000)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO audio_cache (cache_key, audio_base64, created_at) VALUES (?, ?, ?)",
            (cache_key, audio_base64, created_at)
        )
        conn.commit()


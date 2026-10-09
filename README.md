<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Bhiduu - The Savage Reply AI (Python Full-Stack)

A multi-personality savage comeback and roast generation AI app powered by **Python (FastAPI)** and **React 19 (Vite + TypeScript)**.

---

## 🏗️ Architecture

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS
- **Backend**: Python 3.12, FastAPI, Uvicorn, Google GenAI Python SDK (`google-genai`)
- **Database**: SQLite (`backend/bhidu.db`) for persistent chat histories & saved burn cards
- **AI Models**: Gemini 2.5 Flash (Text), Gemini 2.5 Flash TTS (Voice), Gemini 2.5 Flash Image (Meme)

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)

### 1. Setup API Key
Make sure your Gemini API key is set in `.env.local` (or `backend/.env`):
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Setup Python Backend
Dependencies are installed in `backend/venv`. To run the backend:
```bash
# Using npm shortcut:
npm run backend

# OR directly with Python:
backend\venv\Scripts\python run_backend.py
```
Backend will be available at:
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs

### 3. Setup React Frontend
In a separate terminal:
```bash
# Install node dependencies (if not already installed)
npm install

# Start Vite dev server
npm run dev
```
Frontend will be available at: http://localhost:3000

---

## 📡 API Endpoints

- `GET /api/health` - Health check
- `POST /api/chat` - Generate comeback with chosen persona & aggression level
- `GET /api/history/{persona}` - Retrieve conversation history from SQLite
- `DELETE /api/history/{persona}` - Clear conversation history
- `POST /api/tts` - Generate voice audio (base64 PCM)
- `POST /api/meme` - Generate roast meme image card
- `POST /api/burn-cards` - Save burn card to database
- `GET /api/burn-cards` - Get saved burn cards

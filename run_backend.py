import uvicorn

if __name__ == "__main__":
    print("🚀 Starting Bhidu-Bot Python Backend on http://localhost:8000")
    print("📖 Swagger Docs available at http://localhost:8000/docs")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

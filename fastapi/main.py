from fastapi import FastAPI, File, UploadFile
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import openai
import tempfile
import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB
AUDIO_EXTENSIONS = {'mp3', 'wav', 'ogg', 'webm', 'm4a', 'mp4', 'flac', 'amr'}

app = FastAPI(title="Speech-to-Text Chatbot")
app.add_middleware(CORSMiddleware, allow_origins=[
                   "*"], allow_methods=["*"], allow_headers=["*"])


class TranscriptionResponse(BaseModel):
    success: bool
    text: str = None
    error: str = None


client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


@app.get("/", response_class=HTMLResponse)
async def root():
    with open("chatbot.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.post("/api/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(audio: UploadFile = File(...)):
    if not audio.filename:
        return TranscriptionResponse(success=False, error="No file provided")

    file_content = await audio.read()
    if not file_content or len(file_content) > MAX_FILE_SIZE:
        return TranscriptionResponse(success=False, error="Empty or too large file")

    ext = audio.filename.split(
        '.')[-1].lower() if '.' in audio.filename else ''
    if ext not in AUDIO_EXTENSIONS:
        return TranscriptionResponse(success=False, error=f"Unsupported format. Use: {', '.join(AUDIO_EXTENSIONS)}")

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as temp_file:
            temp_file.write(file_content)
            temp_path = temp_file.name

        try:
            with open(temp_path, "rb") as audio_file:
                transcript = client.audio.transcriptions.create(
                    model="gpt-4o-mini-transcribe",  # Alternative: "whisper-1" or "gpt-4o-transcribe"
                    file=audio_file,
                    response_format="text"
                )
            return TranscriptionResponse(success=True, text=transcript.strip())
        finally:
            os.unlink(temp_path)

    except Exception as e:
        return TranscriptionResponse(success=False, error=f"Transcription error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

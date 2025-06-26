from fastapi import FastAPI, File, UploadFile
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from pydub import AudioSegment
import openai
import tempfile
import os
import uvicorn
import logging

load_dotenv()

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB
CHUNK_SIZE_MB = 20  # 20MB for each audio chunk
AUDIO_EXTENSIONS = {'mp3', 'wav', 'ogg', 'webm', 'm4a', 'mp4', 'flac', 'amr'}

app = FastAPI(title="Speech-to-Text Chatbot")
app.add_middleware(CORSMiddleware, allow_origins=[
                   "*"], allow_methods=["*"], allow_headers=["*"])


class TranscriptionResponse(BaseModel):
    success: bool
    text: str = None
    error: str = None


client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def chunk_audio_file(audio_path: str, chunk_size_mb: int = CHUNK_SIZE_MB) -> list:
    try:
        audio = AudioSegment.from_file(audio_path)
        file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
        total_duration_ms = len(audio)
        chunk_duration_ms = int(
            (chunk_size_mb / file_size_mb) * total_duration_ms)

        logger.info(
            f"📊 Chunking: {total_duration_ms/1000:.1f}s → {chunk_duration_ms/1000:.1f}s chunks")

        chunks = []
        for chunk_num, start in enumerate(range(0, total_duration_ms, chunk_duration_ms)):
            end = min(start + chunk_duration_ms, total_duration_ms)
            chunk_path = f"{audio_path}_chunk_{chunk_num}.wav"
            audio[start:end].export(chunk_path, format="wav")
            chunks.append(chunk_path)
            logger.info(
                f"   • Chunk {chunk_num + 1}: {os.path.getsize(chunk_path)/(1024*1024):.1f}MB")

        logger.info(f"✅ Created {len(chunks)} chunks")
        return chunks
    except Exception as e:
        raise Exception(f"Error chunking audio: {str(e)}")


def transcribe_audio_file(file_path: str) -> str:
    with open(file_path, "rb") as audio_file:
        return client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio_file,
            response_format="text"
        ).strip()


@app.get("/", response_class=HTMLResponse)
async def root():
    with open("chatbot.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.post("/api/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(audio: UploadFile = File(...)):
    if not audio.filename:
        return TranscriptionResponse(success=False, error="No file provided")

    file_content = await audio.read()
    if not file_content:
        return TranscriptionResponse(success=False, error="Empty file")

    file_size_mb = len(file_content) / (1024 * 1024)
    logger.info(f"📁 {audio.filename} ({file_size_mb:.2f}MB)")

    ext = audio.filename.split(
        '.')[-1].lower() if '.' in audio.filename else ''
    if ext not in AUDIO_EXTENSIONS:
        return TranscriptionResponse(success=False, error=f"Unsupported format. Use: {', '.join(AUDIO_EXTENSIONS)}")

    temp_files = []
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as temp_file:
            temp_file.write(file_content)
            temp_path = temp_file.name
            temp_files.append(temp_path)

        # Process file based on size
        if len(file_content) > MAX_FILE_SIZE:
            logger.info(
                f"🔄 Chunking required (>{MAX_FILE_SIZE/(1024*1024)}MB)")
            chunk_paths = chunk_audio_file(temp_path, CHUNK_SIZE_MB)
            temp_files.extend(chunk_paths)

            transcripts = []
            for i, chunk_path in enumerate(chunk_paths, 1):
                logger.info(f"   • Processing chunk {i}/{len(chunk_paths)}")
                if transcript := transcribe_audio_file(chunk_path):
                    transcripts.append(transcript)

            full_transcript = " ".join(transcripts)
            logger.info(f"✅ Transcribed {len(chunk_paths)} chunks")
            return TranscriptionResponse(success=True, text=full_transcript)
        else:
            logger.info("⚡ Direct transcription")
            transcript = transcribe_audio_file(temp_path)
            logger.info("✅ Transcription completed")
            return TranscriptionResponse(success=True, text=transcript)

    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        return TranscriptionResponse(success=False, error=f"Transcription error: {str(e)}")
    finally:
        logger.info(f"🧹 Cleaning up {len(temp_files)} files")
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
            except:
                pass

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))

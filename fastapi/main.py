from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import os
import pathlib
from typing import Optional
from pydantic import BaseModel
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Constants
SUPPORTED_FORMATS = {
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/ogg", "audio/mp4", "audio/m4a", 
    "audio/x-m4a", "audio/x-wav", "audio/x-mp3", "audio/webm;codecs=opus", "audio/webm;codecs=pcm",
    "audio/x-matroska", "audio/aac", "audio/flac", "audio/amr", "audio/3gpp", "application/octet-stream"
}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB
TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe"  # Model compatible with GPT-4o-mini

# Configure app
app = FastAPI(title="Speech-to-Text API", description="Convert audio files to text using OpenAI transcription")

# Response model
class TranscriptionResponse(BaseModel):
    success: bool
    text: Optional[str] = None
    error: Optional[str] = None

# Initialize OpenAI client - Fixed import
try:
    import openai
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is required")
    client = openai.OpenAI(api_key=api_key)
except ImportError as e:
    logger.error(f"OpenAI import error: {e}")
    raise RuntimeError("OpenAI package error. Try updating with: pip install --upgrade openai")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup static directory
static_dir = pathlib.Path("static")
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main HTML page"""
    with open(static_dir / "index.html", "r") as f:
        return HTMLResponse(content=f.read())

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "speech-to-text", "openai_configured": bool(api_key)}

@app.post("/api/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(audio: UploadFile = File(...)):
    """Transcribe audio using OpenAI Whisper model"""
    # Validation
    if not audio.filename:
        return TranscriptionResponse(success=False, error="No file provided")
    
    file_content = await audio.read()
    if not file_content:
        return TranscriptionResponse(success=False, error="Empty audio file")
    
    file_size = len(file_content)
    if file_size > MAX_FILE_SIZE:
        return TranscriptionResponse(success=False, error=f"File too large (max {MAX_FILE_SIZE/(1024*1024)}MB)")
    
    # Log content type for debugging
    logger.info(f"Received file: {audio.filename}, type: {audio.content_type}, size: {file_size} bytes")
    
    # More relaxed content type check
    content_type = audio.content_type or "application/octet-stream"
    content_type_base = content_type.split(';')[0].strip()
    
    if content_type_base not in SUPPORTED_FORMATS and content_type not in SUPPORTED_FORMATS:
        # Fallback to extension-based detection
        extension = audio.filename.split('.')[-1].lower() if '.' in audio.filename else None
        if extension not in ('mp3', 'mp4', 'wav', 'ogg', 'webm', 'm4a', 'mpeg', 'amr'):
            return TranscriptionResponse(success=False, error=f"Unsupported audio format: {content_type}")
    
    # Process file
    try:
        # Use appropriate file extension
        extension = f".{audio.filename.split('.')[-1].lower()}" if '.' in audio.filename else ".audio"
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as temp_file:
            temp_file.write(file_content)
            temp_path = temp_file.name
        
        try:
            with open(temp_path, "rb") as audio_file:
                transcript = client.audio.transcriptions.create(
                    model=TRANSCRIPTION_MODEL,
                    file=audio_file,
                    response_format="text"
                )
            
            text = transcript if isinstance(transcript, str) else transcript.text
            return TranscriptionResponse(success=True, text=text.strip())
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
    except Exception as e:
        logger.exception("Transcription error")
        return TranscriptionResponse(success=False, error=f"Transcription error: {str(e)}")

@app.get("/api/models")
async def get_models():
    """Get available models and supported formats"""
    return {
        "models": [TRANSCRIPTION_MODEL],
        "supported_formats": list(SUPPORTED_FORMATS),
        "max_file_size_mb": MAX_FILE_SIZE / (1024 * 1024),
        "compatible_with": "GPT-4o-mini"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
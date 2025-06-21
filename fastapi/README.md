# Speech-to-Text Chatbot

A FastAPI application for speech-to-text transcription using OpenAI's advanced transcription models.

🌐 **Live Demo**: [Deployed on Render](https://speech-to-text-r22a.onrender.com)

## How It Works?

### 1. Frontend Interface (`chatbot.html`)

#### Audio Recording

- Uses `MediaRecorder API` to capture microphone input
- Supports WebM format with automatic fallback
- Records in chunks for better memory management
- Visual feedback with recording indicators

### 2. Backend API (`main.py`)

#### File Processing Pipeline

1. **Request Validation**
   - Checks file presence and size (max 25MB)
   - Validates file extension against supported formats

2. **Temporary File Handling**
  
   ```python
   # Secure temporary file creation
   with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as temp_file:
       temp_file.write(file_content)
   ```

3. **OpenAI API Integration**
  
   ```python
   # Transcription using latest model
   transcript = client.audio.transcriptions.create(
       model="gpt-4o-mini-transcribe",
       file=audio_file,
       response_format="text"
   )
   ```

4. **Cleanup & Response**
   - Automatic temporary file deletion
   - Structured JSON response with success/error status
   - Error handling with detailed messages

## Installation

```bash
# Clone the repository
git clone https://github.com/sujeethshingade/speech-to-text.git
cd speech-to-text/fastapi

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

python3 -m venv venv
source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
copy .env.example .env   # Edit .env and add your OPENAI_API_KEY

# Run the application
python main.py
```

The application will be available at: <http://localhost:8000>

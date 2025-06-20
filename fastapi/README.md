# FastAPI Speech-to-Text Backend

A standalone FastAPI application for speech-to-text functionality using OpenAI's Whisper AI model, optimized for GPT-4o-mini compatibility. This runs completely independently with its own web interface.

## Features

- **Whisper AI Transcription**: High-quality transcription using OpenAI's advanced Whisper-1 model
- **GPT-4o-mini Compatible**: Optimized workflow for seamless integration
- **Standalone Web Interface**: Built-in HTML/JavaScript frontend with modern UI
- **Real-time Audio**: Record audio directly from the browser
- **Multi-format Support**: MP3, MP4, WAV, WebM, OGG, M4A, MPGA, MPEG
- **Self-contained**: No external dependencies or services required
- **Enhanced Error Handling**: Comprehensive error handling and logging

## Quick Start

**Option 1: Using the setup script (Windows)**

```bash
start.bat
```

**Option 2: Manual setup**

1. **Install Dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Configuration**:

   ```bash
   copy .env.example .env
   # Edit .env and add your OpenAI API key
   ```

3. **Start the Application**:

   ```bash
   python main.py
   ```

4. **Access the Application**:

   Open your browser and go to: <http://localhost:8000>

### API Endpoints

#### Whisper AI Transcription

- **POST** `/api/transcribe`
- Uses OpenAI's Whisper-1 model for transcription  
- Optimized for GPT-4o-mini workflow compatibility
- Requires OpenAI API key

#### Model Information

- **GET** `/api/models`
- Returns available transcription models and supported formats

#### Health Check

- **GET** `/health`
- Returns service status and OpenAI connectivity

## File Upload Limits

- Maximum file size: 25MB
- Supported formats: MP3, MP4, WAV, WebM, OGG, M4A, MPGA, MPEG
- Auto language detection supported

## Error Resolution

### Fixed Issues

- ✅ **ThreadMessage import error**: Resolved by upgrading to OpenAI client v1.51.2
- ✅ **Improved error handling**: Better validation and user feedback
- ✅ **Performance optimizations**: Singleton client pattern and efficient file handling

## Development

The server runs with auto-reload enabled by default. Make changes to the code and the server will automatically restart.

For production deployment, consider using:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Dependencies

- FastAPI: Web framework
- Uvicorn: ASGI server  
- OpenAI API: Cloud speech recognition
- Python-multipart: File upload support

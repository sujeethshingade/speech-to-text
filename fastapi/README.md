# FastAPI Speech-to-Text API

A simplified FastAPI application for speech-to-text transcription using OpenAI's Whisper AI model. Clean, optimized, and ready to use.

## ✨ Features

- **OpenAI Whisper Integration**: High-quality transcription using `whisper-1` model
- **Simple Web Interface**: Drag & drop files or record directly in browser  
- **Multiple Audio Formats**: MP3, WAV, M4A, WebM, OGG, FLAC, AMR support
- **Real-time Recording**: Record audio directly from microphone
- **Optimized Code**: Minimal, clean codebase under 100 lines
- **Easy Setup**: One-click setup with batch file

## 🚀 Quick Start

**Windows (Recommended)**
```bash
start.bat
```

**Manual Setup**
```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment
echo OPENAI_API_KEY=your_api_key_here > .env

# Run the application  
python main.py
```

**Access**: Open <http://localhost:8000>

## 📁 Project Structure

```
fastapi/
├── main.py           # Main FastAPI application (75 lines)
├── requirements.txt  # Dependencies (5 packages)
├── start.bat        # Windows setup script
├── .env             # Environment variables
└── static/
    └── index.html   # Single-file web interface
```

## 🔧 API Endpoints

| Method | Endpoint          | Description           |
| ------ | ----------------- | --------------------- |
| `GET`  | `/`               | Web interface         |
| `POST` | `/api/transcribe` | Transcribe audio file |
| `GET`  | `/api/models`     | Available models info |
| `GET`  | `/health`         | Service health check  |

## 📋 Requirements

- Python 3.8+
- OpenAI API key
- Modern web browser (for recording)

## 🎯 Usage

1. **File Upload**: Drag & drop audio files or click to select
2. **Recording**: Click microphone button to record audio
3. **Transcription**: Automatic transcription with real-time results

## 🔧 Configuration

Edit `.env` file:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

## 📊 Specifications

- **Max File Size**: 25MB
- **Supported Formats**: MP3, WAV, M4A, WebM, OGG, FLAC, AMR
- **Model**: OpenAI Whisper-1
- **Response Time**: ~2-5 seconds per minute of audio

## 🚀 Deployment

**Development**
```bash
python main.py
```

**Production**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 🔍 Troubleshooting

**OpenAI Import Error**: Update OpenAI package
```bash
pip install --upgrade openai==1.3.8
```

**Audio Format Error**: Ensure file extension matches audio format

**Microphone Access**: Use HTTPS in production for microphone access

## 📦 Dependencies

- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `openai` - OpenAI API client
- `python-multipart` - File upload support
- `python-dotenv` - Environment management

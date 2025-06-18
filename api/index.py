from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os
import warnings
import json
import time
import time

app = Flask(__name__)
CORS(app)

# Suppress FP16 warnings
warnings.filterwarnings(
    "ignore", message="FP16 is not supported on CPU; using FP32 instead")

# Global model variable for serverless optimization
model = None


def get_model():
    """Lazy load the model to optimize cold starts"""
    global model
    if model is None:
        try:
            import whisper
            # Use tiny model for faster loading and smaller size
            model = whisper.load_model("tiny", device="cpu")
        except Exception as e:
            print(f"Error loading Whisper model: {e}")
            return None
    return model


@app.route("/api/transcribe", methods=["POST"])
def transcribe_audio():
    try:
        # Check if running on Vercel (serverless environment)
        is_vercel = os.environ.get('VERCEL') == '1'

        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400

        audio_file = request.files['audio']

        if audio_file.filename == '':
            return jsonify({"error": "No audio file selected"}), 400

        # Check file size (limit to 25MB for Vercel)
        audio_file.seek(0, 2)  # Seek to end
        file_size = audio_file.tell()
        audio_file.seek(0)  # Reset to beginning

        if file_size > 25 * 1024 * 1024:  # 25MB limit
            return jsonify({"error": "File too large. Maximum size is 25MB."}), 413

        # Get the model
        whisper_model = get_model()
        if whisper_model is None:
            return jsonify({"error": "Speech recognition service unavailable"}), 503

        # Create a unique temporary file with timestamp to avoid conflicts
        timestamp = str(int(time.time() * 1000))
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"whisper_audio_{timestamp}.webm")

        try:
            # Save the uploaded audio to the temporary file
            audio_file.save(temp_path)

            # Transcribe the audio with explicit fp16=False for CPU
            # Use additional options to reduce processing time
            result = whisper_model.transcribe(
                temp_path,
                fp16=False,
                verbose=False,
                word_timestamps=False,
                language=None  # Auto-detect language
            )

            # Extract only the text to minimize response size
            text = result.get("text", "").strip()

            # Limit response size (max 10KB of text)
            if len(text) > 10000:
                text = text[:10000] + "... (truncated)"

        finally:
            # Clean up the temporary file - multiple attempts for Windows
            cleanup_attempts = 0
            max_attempts = 3
            while cleanup_attempts < max_attempts:
                try:
                    if os.path.exists(temp_path):
                        os.unlink(temp_path)
                        break  # Successfully deleted
                except (OSError, PermissionError) as cleanup_error:
                    cleanup_attempts += 1
                    if cleanup_attempts < max_attempts:
                        time.sleep(0.1)  # Brief delay before retry
                    else:
                        print(
                            f"Warning: Could not delete temporary file {temp_path} after {max_attempts} attempts: {cleanup_error}")

        # Return minimal response to avoid "data too long" error
        return jsonify({
            "text": text,
            "success": True
        })

    except Exception as e:
        error_msg = str(e)
        # Limit error message size
        if len(error_msg) > 500:
            error_msg = error_msg[:500] + "..."

        return jsonify({
            "error": error_msg,
            "success": False
        }), 500


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint for Vercel"""
    return jsonify({
        "status": "healthy",
        "service": "speech-to-text",
        "timestamp": str(int(time.time()))
    })


@app.route("/", methods=["GET"])
def root():
    """Root endpoint"""
    return jsonify({
        "message": "Speech-to-Text API",
        "endpoints": {
            "transcribe": "/api/transcribe (POST)",
            "health": "/api/health (GET)"
        }
    })

# Vercel requires a handler function


def handler(request):
    """Vercel serverless function handler"""
    return app(request.environ, request.start_response)

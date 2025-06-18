from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os
import whisper

app = Flask(__name__)
CORS(app)

# Global Whisper model - loaded once on startup
# Using the "tiny" model for faster processing and lower resource usage
model = whisper.load_model("tiny")


@app.route("/api/transcribe", methods=["POST"])
def transcribe_audio():
    try:
        # Check if audio file is provided
        if 'audio' not in request.files or request.files['audio'].filename == '':
            return jsonify({"error": "No audio file provided"}), 400

        audio_file = request.files['audio']

        # Check file size (25MB limit)
        audio_file.seek(0, 2)
        if audio_file.tell() > 25 * 1024 * 1024:
            return jsonify({"error": "File too large. Maximum size is 25MB."}), 413
        audio_file.seek(0)

        # Create temporary file for processing
        temp_path = os.path.join(tempfile.gettempdir(), "whisper_audio.webm")

        try:
            # Save uploaded file and transcribe
            audio_file.save(temp_path)
            result = model.transcribe(temp_path, fp16=False, verbose=False)
            text = result.get("text", "").strip()

        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)

        return jsonify({"text": text, "success": True})

    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5328)

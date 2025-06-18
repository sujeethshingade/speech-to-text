from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import tempfile
import os
import warnings

app = Flask(__name__)
CORS(app)

# Suppress FP16 warnings
warnings.filterwarnings(
    "ignore", message="FP16 is not supported on CPU; using FP32 instead")

# Load Whisper model (using tiny model for balance of speed and accuracy)
# Explicitly set fp16=False to avoid warnings on CPU
model = whisper.load_model("tiny", device="cpu")


@app.route("/api/transcribe", methods=["POST"])
def transcribe_audio():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400

        audio_file = request.files['audio']

        if audio_file.filename == '':
            return jsonify({"error": "No audio file selected"}), 400

        # Save the uploaded file temporarily
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.webm')
        temp_path = temp_file.name
        temp_file.close()  # Close the file handle so Windows can access it

        try:
            # Save the uploaded audio to the temporary file
            audio_file.save(temp_path)

            # Transcribe the audio with explicit fp16=False for CPU
            result = model.transcribe(temp_path, fp16=False)
            text = result["text"].strip()

        finally:
            # Clean up the temporary file
            try:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
            except Exception as cleanup_error:
                print(
                    f"Warning: Could not delete temporary file {temp_path}: {cleanup_error}")

        return jsonify({"text": text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)

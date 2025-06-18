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

# Load Whisper model (using base model for balance of speed and accuracy)
# Explicitly set fp16=False to avoid warnings on CPU
model = whisper.load_model("base", device="cpu")


@app.route("/api/transcribe", methods=["POST"])
def transcribe_audio():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400

        audio_file = request.files['audio']

        if audio_file.filename == '':
            return jsonify({"error": "No audio file selected"}), 400

        # Create a unique temporary file with timestamp to avoid conflicts
        import time
        timestamp = str(int(time.time() * 1000))
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"whisper_audio_{timestamp}.webm")

        try:
            # Save the uploaded audio to the temporary file
            audio_file.save(temp_path)

            # Transcribe the audio with explicit fp16=False for CPU
            result = model.transcribe(temp_path, fp16=False)
            text = result["text"].strip()

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
                        # Try to mark file for deletion on next reboot as last resort
                        try:
                            import atexit
                            atexit.register(lambda: os.path.exists(
                                temp_path) and os.unlink(temp_path))
                        except:
                            pass

        return jsonify({"text": text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)

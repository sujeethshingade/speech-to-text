from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from dotenv import load_dotenv
import json
import asyncio
import websockets
import os
import logging
import uvicorn

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

logger = logging.getLogger(__name__)

app = FastAPI(title="Speech-to-Text Chatbot")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview"

if not OPENAI_API_KEY:
    logger.error("⚠️ OPENAI_API_KEY environment variable not set")
else:
    logger.info("✅ OpenAI API key loaded successfully")


class RealtimeConnection:
    def __init__(self, client_ws: WebSocket):
        self.client_ws = client_ws
        self.openai_ws = None
        self.is_connected = False

    async def connect_to_openai(self):
        try:
            logger.info("🔄 Connecting to OpenAI Realtime API...")

            headers = {
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "OpenAI-Beta": "realtime=v1"
            }

            self.openai_ws = await websockets.connect(
                OPENAI_REALTIME_URL, extra_headers=headers
            )
            self.is_connected = True
            logger.info("✅ Connected to OpenAI Realtime API")

            # Session configuration
            session_config = {
                "type": "session.update",
                "session": {
                    "modalities": ["text", "audio"],
                    "instructions": "You are a helpful assistant. Be concise and natural in your responses.",
                    "voice": "alloy",
                    "input_audio_format": "pcm16",
                    "output_audio_format": "pcm16",
                    "input_audio_transcription": {"model": "gpt-4o-mini-transcribe"},
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.5,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 500
                    },
                    "temperature": 0.7,
                    "max_response_output_tokens": 4096
                }
            }

            logger.info("⚙️  Configuring session...")
            await self.openai_ws.send(json.dumps(session_config))

            # Wait for session creation response
            response = await asyncio.wait_for(self.openai_ws.recv(), timeout=5)
            response_data = json.loads(response)

            if response_data.get("type") == "session.created":
                logger.info("✅ Session created successfully")

            elif response_data.get("type") == "error":
                error_msg = response_data.get("error", {}).get(
                    "message", "Unknown error")
                logger.error(f"❌ Session creation failed: {error_msg}")
                raise Exception(f"Session creation failed: {error_msg}")

            else:
                logger.warning(
                    f"⚠️ Unexpected session response: {response_data.get('type')}")

        except asyncio.TimeoutError:
            logger.error("⏰ Timeout waiting for session creation")
            self.is_connected = False
            raise Exception("Timeout waiting for session creation")

        except Exception as e:
            logger.error(f"❌ Failed to connect to OpenAI: {e}")
            self.is_connected = False
            raise

    async def handle_openai_messages(self):
        try:
            logger.info("📥 Starting OpenAI message handler")

            while self.is_connected and self.openai_ws:
                message = await self.openai_ws.recv()
                data = json.loads(message)

                event_type = data.get("type")

                if event_type in ["session.created", "session.updated", "conversation.item.created"]:
                    logger.info(f"📨 OpenAI event: {event_type}")

                elif event_type == "error":
                    error_data = data.get("error", {})
                    error_msg = error_data.get("message", "Unknown error")
                    error_code = error_data.get("code", "unknown")

                    logger.error(
                        f"❌ OpenAI API error [{error_code}]: {error_msg}")

                elif event_type in ["input_audio_buffer.speech_started", "input_audio_buffer.speech_stopped"]:
                    logger.debug(f"🎤 Speech event: {event_type}")

                await self.client_ws.send_text(json.dumps(data))

        except websockets.exceptions.ConnectionClosed:
            logger.info("🔌 OpenAI connection closed")
            self.is_connected = False

        except Exception as e:
            logger.error(f"❌ Error handling OpenAI messages: {e}")
            self.is_connected = False

    async def send_to_openai(self, message: dict):
        if not self.is_connected or not self.openai_ws:
            logger.warning("⚠️ Cannot send message: not connected to OpenAI")
            return

        try:
            msg_type = message.get("type")

            if msg_type == "input_audio_buffer.append":
                audio_data = message.get("audio", "")
                if not audio_data or len(audio_data) == 0:
                    logger.warning("⚠️ Skipping empty audio buffer")
                    return

            await self.openai_ws.send(json.dumps(message))

        except Exception as e:
            logger.error(f"❌ Error sending to OpenAI: {e}")
            if "buffer too small" in str(e).lower():
                logger.warning("⚠️ Audio buffer error - continuing connection")
                # Send error back to client
                await self.client_ws.send_text(json.dumps({
                    "type": "error",
                    "error": {"message": "Audio buffer too small. Please record longer."}
                }))

    async def close(self):
        self.is_connected = False
        if self.openai_ws:
            await self.openai_ws.close()
            logger.info("🔌 OpenAI connection closed")


@app.get("/")
async def serve_index():
    return FileResponse("chatbot.html")


@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("🔌 New client connected")

    if not OPENAI_API_KEY:
        error_msg = "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
        logger.error(f"❌ {error_msg}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "error": {"message": error_msg}
        }))
        await websocket.close()
        return

    connection = RealtimeConnection(websocket)
    openai_task = None

    try:
        await connection.connect_to_openai()
        openai_task = asyncio.create_task(connection.handle_openai_messages())
        logger.info("🚀 Realtime connection established")

        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                await connection.send_to_openai(message)

            except WebSocketDisconnect:
                logger.info("🔌Client disconnected")
                break

            except json.JSONDecodeError as e:
                logger.error(f"❌ Invalid JSON from client: {e}")
                continue

            except Exception as e:
                logger.error(f"❌ Error handling client message: {e}")
                if "buffer too small" in str(e).lower():
                    logger.warning("⚠️ Audio buffer error - continuing")
                    continue
                break

    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}")
        error_message = str(e)

        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "error": {"message": f"Connection error: {error_message}"}
            }))

        except:
            logger.warning("⚠️ Could not send error message to client")

    finally:
        if openai_task:
            openai_task.cancel()
        await connection.close()
        logger.info("🧹 Client connection cleaned up")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

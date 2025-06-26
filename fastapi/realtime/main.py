from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from typing import Dict
import json
import asyncio
import websockets
import os
import logging
import uvicorn

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Speech-to-Text Chatbot")

app.mount("/static", StaticFiles(directory="."), name="static")

active_connections: Dict[str, WebSocket] = {}

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview"

if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY environment variable not set")


class RealtimeConnection:
    def __init__(self, client_ws: WebSocket):
        self.client_ws = client_ws
        self.openai_ws = None
        self.is_connected = False

    async def connect_to_openai(self):
        try:
            headers = {
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "OpenAI-Beta": "realtime=v1"
            }

            self.openai_ws = await websockets.connect(
                OPENAI_REALTIME_URL,
                extra_headers=headers
            )

            self.is_connected = True
            logger.info("Connected to OpenAI Realtime API")

            # Send session configuration
            session_config = {
                "type": "session.update",
                "session": {
                    "modalities": ["text", "audio"],
                    "instructions": "You are a helpful assistant. Be concise and natural in your responses.",
                    "voice": "alloy",
                    "input_audio_format": "pcm16",
                    "output_audio_format": "pcm16",
                    "input_audio_transcription": {
                        "model": "gpt-4o-mini-transcribe",
                    },
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.7,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 1000
                    },
                    "temperature": 0.7,
                    "max_response_output_tokens": 4096
                }
            }

            logger.info(
                f"Sending session config: {json.dumps(session_config, indent=2)}")
            await self.openai_ws.send(json.dumps(session_config))

            # Wait for session created response
            response = await asyncio.wait_for(self.openai_ws.recv(), timeout=5)
            response_data = json.loads(response)

            if response_data.get("type") == "session.created":
                logger.info("Session created successfully")
            elif response_data.get("type") == "error":
                error_msg = response_data.get("error", {}).get(
                    "message", "Unknown error")
                logger.error(f"Session creation failed: {error_msg}")
                raise Exception(f"Session creation failed: {error_msg}")
            else:
                logger.warning(f"Unexpected response: {response_data}")

        except asyncio.TimeoutError:
            logger.error("Timeout waiting for session creation response")
            self.is_connected = False
            raise Exception("Timeout waiting for session creation")
        except Exception as e:
            logger.error(f"Failed to connect to OpenAI: {e}")
            self.is_connected = False
            raise

    async def handle_openai_messages(self):
        try:
            while self.is_connected and self.openai_ws:
                message = await self.openai_ws.recv()
                data = json.loads(message)

                if data.get("type") in ["session.created", "error", "session.updated"]:
                    logger.info(f"OpenAI event: {data.get('type')} - {data}")

                if data.get("type") == "error":
                    logger.error(
                        f"OpenAI API error: {data.get('error', {}).get('message', 'Unknown error')}")

                await self.client_ws.send_text(json.dumps(data))

        except websockets.exceptions.ConnectionClosed:
            logger.info("OpenAI connection closed")
            self.is_connected = False
        except Exception as e:
            logger.error(f"Error handling OpenAI messages: {e}")
            self.is_connected = False

    async def send_to_openai(self, message: dict):
        if self.is_connected and self.openai_ws:
            try:
                await self.openai_ws.send(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending to OpenAI: {e}")

    async def close(self):
        self.is_connected = False
        if self.openai_ws:
            await self.openai_ws.close()


@app.get("/")
async def serve_index():
    return FileResponse("chatbot.html")


@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    if not OPENAI_API_KEY:
        await websocket.send_text(json.dumps({
            "type": "error",
            "error": {
                "message": "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
            }
        }))
        await websocket.close()
        return

    connection = RealtimeConnection(websocket)
    connection_id = id(websocket)
    active_connections[connection_id] = websocket
    openai_task = None

    try:
        await connection.connect_to_openai()
        openai_task = asyncio.create_task(connection.handle_openai_messages())

        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)

                await connection.send_to_openai(message)

            except WebSocketDisconnect:
                logger.info("Client disconnected")
                break
            except Exception as e:
                logger.error(f"Error handling client message: {e}")
                break

    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        error_message = str(e)
        if "Invalid value" in error_message and "turn_detection" in error_message:
            error_message = "Turn detection configuration error. Please check server logs."

        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "error": {
                    "message": f"Connection error: {error_message}"
                }
            }))
        except:
            pass

    finally:
        if openai_task:
            openai_task.cancel()
        await connection.close()
        if connection_id in active_connections:
            del active_connections[connection_id]


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

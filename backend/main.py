import os
import json
import uuid
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.genai.types import Content, Part
from pydantic import BaseModel
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Map GEMINI_API_KEY to GOOGLE_API_KEY if present (often used in env files)
gemini_api_key = os.getenv("GEMINI_API_KEY")
if gemini_api_key:
    # Strip quotes and whitespace that might be in the .env file
    os.environ["GOOGLE_API_KEY"] = gemini_api_key.strip().strip('"').strip("'")
    logger.info("✅ GEMINI_API_KEY found and mapped to GOOGLE_API_KEY")

# Setup Google Cloud credentials
def setup_google_credentials():
    """Setup Google credentials for Vertex AI"""
    try:
        # Get credentials path from env, or use default
        credentials_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        if not credentials_path:
            credentials_path = os.path.join(os.path.dirname(__file__), 'ascendant-woods-462020-n0-040fd17bd130.json')
        
        # If relative path, make it absolute
        if not os.path.isabs(credentials_path):
            credentials_path = os.path.join(os.path.dirname(__file__), credentials_path)
        
        if os.path.exists(credentials_path):
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
            logger.info(f"✅ Service account file found: {credentials_path}")
        else:
            logger.warning(f"⚠️ Service account file not found at: {credentials_path}")
        
        # Set required Google Cloud environment variables from .env
        if not os.getenv('GOOGLE_CLOUD_PROJECT'):
            os.environ['GOOGLE_CLOUD_PROJECT'] = 'ascendant-woods-462020-n0'
        if not os.getenv('GOOGLE_CLOUD_LOCATION'):
            os.environ['GOOGLE_CLOUD_LOCATION'] = 'us-central1'
        
        logger.info(f"✅ Google Cloud configured: Project={os.environ['GOOGLE_CLOUD_PROJECT']}, Location={os.environ['GOOGLE_CLOUD_LOCATION']}")
    except Exception as e:
        logger.error(f"Failed to setup Google credentials: {e}")
        raise

# Setup credentials only if Vertex AI is enabled
if os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "FALSE").upper() == "TRUE":
    setup_google_credentials()
else:
    logger.info("ℹ️ Using Gemini API Key mode (Vertex AI disabled)")

app = FastAPI(title="Moot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize session service
session_service = InMemorySessionService()

class ChatRequest(BaseModel):
    message: str
    user_id: str = "default_user"
    session_id: Optional[str] = None
    agent_id: str = "legal_agent"
    voice_id: Optional[str] = None

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Streaming chat endpoint with session memory"""
    async def generate_stream():
        try:
            # Use existing session or create new one
            session_id = request.session_id or str(uuid.uuid4())
            yield f"data: {json.dumps({'type': 'session', 'session_id': session_id})}\n\n"

            # Ensure session exists - this enables memory across conversations
            session = await session_service.get_session(
                app_name="moot_app",
                user_id=request.user_id,
                session_id=session_id
            )
            if not session:
                session = await session_service.create_session(
                    app_name="moot_app",
                    user_id=request.user_id,
                    session_id=session_id,
                    state={}
                )
                logger.info(f"📝 Created new session: {session_id}")
            else:
                logger.info(f"📝 Using existing session: {session_id}")

            # Route to agent
            if "legal" in request.agent_id or "shisui" in request.agent_id:
                from agents.legal_agent import legal_agent
                
                # Create runner with session service - this enables memory
                runner = Runner(
                    agent=legal_agent,
                    app_name="moot_app",
                    session_service=session_service
                )

                # Voice Service (Lazy init)
                from services.voice_service import VoiceService
                voice_service = VoiceService()
                
                # Text buffer for sentence detection
                text_buffer = ""
                import re
                import base64

                # Run with the session - ADK automatically loads history from session
                async for event in runner.run_async(
                    user_id=request.user_id,
                    session_id=session_id,  # This is the KEY - reuse the same session_id!
                    new_message=Content(role='user', parts=[Part(text=request.message)]),
                    run_config=RunConfig(streaming_mode=StreamingMode.SSE),
                ):
                    # Handle tool calls
                    if event.content and event.content.parts:
                        for part in event.content.parts:
                            if hasattr(part, 'function_call') and part.function_call:
                                tool_data = {
                                    'type': 'tool_call',
                                    'tool_name': part.function_call.name
                                }
                                yield f"data: {json.dumps(tool_data)}\n\n"
                                logger.info(f"🔧 Tool call: {part.function_call.name}")
                            
                            # Stream text content
                            elif hasattr(part, 'text') and part.text and event.partial:
                                text_chunk = part.text
                                
                                # 1. Stream text immediately
                                chunk_data = {
                                    'type': 'content',
                                    'content': text_chunk
                                }
                                yield f"data: {json.dumps(chunk_data)}\n\n"

                                # 2. Buffer for Audio
                                if request.voice_id:
                                    text_buffer += text_chunk
                                    # Split by sentence endings (. ! ?)
                                    # Look for punctuation followed by space or end of string
                                    sentences = re.split(r'(?<=[.!?])\s+', text_buffer)
                                    
                                    # If we have complete sentences (more than 1 element or ends with punctuation), process them
                                    if len(sentences) > 1:
                                        # Process all except the last one (which might be incomplete)
                                        to_process = sentences[:-1]
                                        text_buffer = sentences[-1] # Keep the remainder
                                        
                                        logger.info(f"🎵 Processing {len(to_process)} sentence(s), remaining buffer: '{text_buffer[:50]}...'")
                                        
                                        for sentence in to_process:
                                            if sentence.strip():
                                                # Use non-streaming TTS for complete audio
                                                full_audio = await voice_service.generate_speech(sentence, request.voice_id)
                                                
                                                if full_audio:
                                                    logger.info(f"🎵 Sending audio chunk: {len(full_audio)} bytes for sentence")
                                                    b64_audio = base64.b64encode(full_audio).decode('utf-8')
                                                    audio_data = {
                                                        'type': 'audio',
                                                        'data': b64_audio
                                                    }
                                                    yield f"data: {json.dumps(audio_data)}\n\n"
                
                # Process remaining buffer
                if request.voice_id and text_buffer.strip():
                    logger.info(f"🎵 Processing remaining buffer: '{text_buffer}'")
                    # Use non-streaming TTS for complete audio
                    full_audio = await voice_service.generate_speech(text_buffer, request.voice_id)
                    
                    if full_audio:
                        logger.info(f"🎵 Sending final audio chunk: {len(full_audio)} bytes")
                        b64_audio = base64.b64encode(full_audio).decode('utf-8')
                        audio_data = {
                            'type': 'audio',
                            'data': b64_audio
                        }
                        yield f"data: {json.dumps(audio_data)}\n\n"

                yield f"data: {json.dumps({'type': 'done'})}\n\n"
            else:
                error_data = {'type': 'error', 'error': f'Agent {request.agent_id} not implemented'}
                yield f"data: {json.dumps(error_data)}\n\n"

        except Exception as e:
            logger.error(f"Error in streaming chat: {str(e)}")
            error_data = {'type': 'error', 'error': str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )

@app.get("/voices")
async def get_voices():
    """Get available voices from ElevenLabs"""
    from services.voice_service import VoiceService
    service = VoiceService()
    voices = await service.get_voices()
    return {"voices": voices}

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Handle PDF uploads.
    """
    import shutil
    import uuid
    import os
    
    # Create uploads dir if not exists
    os.makedirs("uploads", exist_ok=True)
    
    file_id = str(uuid.uuid4())
    file_location = f"uploads/{file_id}_{file.filename}"
    
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"file_id": file_id, "filename": file.filename, "status": "ready"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

import os
import logging
from typing import List, Dict, AsyncGenerator
from elevenlabs import AsyncElevenLabs

logger = logging.getLogger(__name__)

class VoiceService:
    def __init__(self):
        # Check for different possible env var names
        self.api_key = (
            os.getenv("11LABS_API_KEY_GAZELLE") or 
            os.getenv("ELEVENLABS_API_KEY") or 
            os.getenv("ELEVEN_API_KEY")
        )
        if not self.api_key:
            logger.warning("⚠️ No ElevenLabs API key found. Voice features will be disabled.")
            self.client = None
        else:
            # Strip any quotes or whitespace from the API key
            self.api_key = self.api_key.strip().strip('"').strip("'")
            logger.info(f"✅ ElevenLabs API key loaded (first 8 chars: {self.api_key[:8]}...)")
            self.client = AsyncElevenLabs(api_key=self.api_key)

    async def get_voices(self) -> List[Dict]:
        """Fetch available voices from ElevenLabs."""
        if not self.client:
            return []
            
        try:
            response = await self.client.voices.get_all()
            voices = []
            for voice in response.voices:
                voices.append({
                    "voice_id": voice.voice_id,
                    "name": voice.name,
                    "category": voice.category or "custom"
                })
            return voices
        except Exception as e:
            logger.error(f"Failed to fetch voices: {e}")
            return []

    async def generate_speech(
        self, 
        text: str, 
        voice_id: str, 
        model_id: str = "eleven_turbo_v2"
    ) -> bytes:
        """Generate speech from text and return complete audio bytes."""
        if not self.client:
            return b""

        try:
            logger.info(f"🎵 Requesting TTS for {len(text)} chars: '{text[:50]}...'")
            
            # Get the audio stream - DO NOT await, it returns an async generator directly
            audio_stream = self.client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id=model_id,
                voice_settings={
                    "stability": 0.5,
                    "similarity_boost": 0.75
                }
            )
            
            # Collect all audio bytes by iterating over the async generator
            audio_chunks = []
            async for chunk in audio_stream:
                if isinstance(chunk, bytes):
                    audio_chunks.append(chunk)
            
            full_audio = b"".join(audio_chunks)
            logger.info(f"🎵 Received {len(full_audio)} bytes of audio")
            return full_audio
            
        except Exception as e:
            logger.error(f"Error generating speech: {e}")
            return b""

    async def generate_speech_stream(
        self, 
        text: str, 
        voice_id: str, 
        model_id: str = "eleven_turbo_v2"
    ) -> AsyncGenerator[bytes, None]:
        """Generate speech from text and yield audio chunks as they arrive."""
        if not self.client:
            return

        try:
            logger.info(f"🎵 Streaming TTS for {len(text)} chars: '{text[:50]}...'")
            
            # Get the audio stream - DO NOT await, it returns an async generator directly
            audio_stream = self.client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id=model_id,
                voice_settings={
                    "stability": 0.5,
                    "similarity_boost": 0.75
                }
            )
            
            # Yield chunks as they arrive (proper async iteration)
            async for chunk in audio_stream:
                if isinstance(chunk, bytes):
                    yield chunk
                
        except Exception as e:
            logger.error(f"Error streaming speech: {e}")

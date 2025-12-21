/**
 * Voice Service
 * 
 * ElevenLabs Text-to-Speech service for server-side audio generation.
 */

import { Voice } from '../types';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

/**
 * Get the ElevenLabs API key from environment
 */
function getApiKey(): string | null {
    // Note: Vercel doesn't allow env vars starting with digits, so use ELEVENLABS_API_KEY
    return process.env.ELEVENLABS_API_KEY ||
        process.env.ELEVEN_API_KEY ||
        null;
}

/**
 * Fetch available voices from ElevenLabs
 */
export async function getVoices(): Promise<Voice[]> {
    const apiKey = getApiKey();

    if (!apiKey) {
        console.warn('No ElevenLabs API key found. Voice features will be disabled.');
        return [];
    }

    try {
        const response = await fetch('https://api.elevenlabs.io/v2/voices', {
            headers: {
                'xi-api-key': apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch voices: ${response.statusText}`);
        }

        const data = await response.json();

        return data.voices.map((voice: any) => ({
            voice_id: voice.voice_id,
            name: voice.name,
            category: voice.category || 'custom'
        }));

    } catch (error) {
        console.error('Error fetching voices:', error);
        return [];
    }
}

/**
 * Generate speech from text and return audio as base64-encoded string
 */
export async function generateSpeech(
    text: string,
    voiceId: string,
    modelId: string = 'eleven_turbo_v2'
): Promise<string | null> {
    const apiKey = getApiKey();

    if (!apiKey) {
        console.warn('No ElevenLabs API key - cannot generate speech');
        return null;
    }

    if (!text.trim()) {
        return null;
    }

    try {
        console.log(`Requesting TTS for ${text.length} chars: '${text.slice(0, 50)}...'`);

        const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey
            },
            body: JSON.stringify({
                text,
                model_id: modelId,
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs API error:', response.status, errorText);
            return null;
        }

        // Get the audio as array buffer
        const audioBuffer = await response.arrayBuffer();

        // Convert to base64
        const base64Audio = Buffer.from(audioBuffer).toString('base64');

        console.log(`Received ${audioBuffer.byteLength} bytes of audio`);
        return base64Audio;

    } catch (error) {
        console.error('Error generating speech:', error);
        return null;
    }
}

/**
 * Strip markdown formatting and citation markers for TTS
 */
export function stripMarkdown(text: string): string {
    let result = text;

    // Remove CITATION markers (for citations panel)
    result = result.replace(/\[CITATION:.*?\]/g, '');

    // Remove DOWNLOAD_LINK markers
    result = result.replace(/\[DOWNLOAD_LINK:[^\]]+\]/g, '');

    // Remove LINK_PROVIDED markers
    result = result.replace(/\[LINK_PROVIDED:[^\]]+\]/g, '');

    // Remove bold/italic markers
    result = result.replace(/\*\*(.+?)\*\*/g, '$1');  // **bold**
    result = result.replace(/\*(.+?)\*/g, '$1');      // *italic*
    result = result.replace(/__(.+?)__/g, '$1');      // __bold__
    result = result.replace(/_(.+?)_/g, '$1');        // _italic_

    // Remove headers
    result = result.replace(/^#{1,6}\s*/gm, '');

    // Remove links, keep text
    result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove code blocks
    result = result.replace(/```[\s\S]*?```/g, '');
    result = result.replace(/`([^`]+)`/g, '$1');

    // Remove horizontal rules
    result = result.replace(/^---+$/gm, '');

    // Clean up extra whitespace
    result = result.replace(/\n\s*\n/g, '\n');

    return result.trim();
}

export default { getVoices, generateSpeech, stripMarkdown };

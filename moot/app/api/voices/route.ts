/**
 * Voices API Route
 * 
 * Get available voices from ElevenLabs.
 * Replaces the Python FastAPI /voices endpoint.
 */

import { NextResponse } from 'next/server';
import { getVoices } from '../../lib/services/voice-service';

export async function GET() {
    try {
        const voices = await getVoices();
        return NextResponse.json({ voices });
    } catch (error) {
        console.error('Error fetching voices:', error);
        return NextResponse.json(
            { error: 'Failed to fetch voices', voices: [] },
            { status: 500 }
        );
    }
}

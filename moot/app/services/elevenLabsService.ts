
export interface Voice {
    voice_id: string;
    name: string;
    category: string;
    preview_url?: string;
}

export class ElevenLabsService {
    private apiKey: string;
    private baseUrl = "https://api.elevenlabs.io/v1";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async getVoices(): Promise<Voice[]> {
        try {
            const response = await fetch("https://api.elevenlabs.io/v2/voices", {
                headers: {
                    "xi-api-key": this.apiKey
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch voices: ${response.statusText}`);
            }

            const data = await response.json();
            return data.voices;
        } catch (error) {
            console.error("Error fetching voices:", error);
            return [];
        }
    }

    async generateSpeechStream(text: string, voiceId: string): Promise<ArrayBuffer | null> {
        try {
            const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}/stream`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": this.apiKey
                },
                body: JSON.stringify({
                    text,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("ElevenLabs API error:", response.status, errorText);
                throw new Error(`Failed to generate speech: ${response.statusText}`);
            }

            return await response.arrayBuffer();
        } catch (error) {
            console.error("Error generating speech:", error);
            return null;
        }
    }
}

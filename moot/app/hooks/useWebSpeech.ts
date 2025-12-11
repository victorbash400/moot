import { useState, useEffect, useRef, useCallback } from 'react';

// Define types for the Web Speech API since they aren't in standard TS lib.dom.d.ts by default
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: (event: Event) => void;
    onend: (event: Event) => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: any) => void;
}

// Window interface extension
declare global {
    interface Window {
        webkitSpeechRecognition: {
            new(): SpeechRecognition;
        };
        SpeechRecognition: {
            new(): SpeechRecognition;
        };
    }
}

interface UseWebSpeechProps {
    onFinalTranscript?: (transcript: string) => void;
    language?: string;
    continuous?: boolean;
}

export const useWebSpeech = ({
    onFinalTranscript,
    language = 'en-US',
    continuous = true
}: UseWebSpeechProps = {}) => {
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        // Check browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = continuous;
            recognition.interimResults = true;
            recognition.lang = language;

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let finalTrans = '';
                let interimTrans = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTrans += event.results[i][0].transcript;
                    } else {
                        interimTrans += event.results[i][0].transcript;
                    }
                }

                if (finalTrans && onFinalTranscript) {
                    onFinalTranscript(finalTrans);
                }

                setInterimTranscript(interimTrans);
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [language, continuous, onFinalTranscript]);

    const startListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
            } catch (error) {
                console.error("Error starting recognition:", error);
            }
        }
    }, []);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }, []);

    const abortListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }
    }, []);

    return {
        isListening,
        interimTranscript,
        startListening,
        stopListening,
        abortListening,
        isSupported: !!(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition))
    };
};

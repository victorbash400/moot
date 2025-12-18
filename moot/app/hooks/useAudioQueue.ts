import { useState, useRef, useCallback, useEffect } from 'react';

export const useAudioQueue = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const queueRef = useRef<AudioBuffer[]>([]);
    const isProcessingRef = useRef(false);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const isReceivingRef = useRef(false); // Track if we're still receiving audio chunks
    const playbackEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize AudioContext lazily
    const getAudioContext = useCallback(() => {
        // Check if context is null OR closed - create new one in either case
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            console.log('🔊 Creating new AudioContext');
            // @ts-ignore - Handle webkit prefix
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    const playNext = useCallback(async () => {
        if (queueRef.current.length === 0) {
            console.log('🔊 Audio queue empty - checking if still receiving...');
            isProcessingRef.current = false;

            // Only set isPlaying to false if we're not expecting more chunks
            // Use a small delay to allow for network latency between chunks
            if (playbackEndTimeoutRef.current) {
                clearTimeout(playbackEndTimeoutRef.current);
            }
            playbackEndTimeoutRef.current = setTimeout(() => {
                if (queueRef.current.length === 0 && !isReceivingRef.current) {
                    console.log('🔊 No more audio expected - stopping playback state');
                    setIsPlaying(false);
                } else if (queueRef.current.length > 0) {
                    console.log('🔊 More audio arrived during delay - continuing');
                    playNext();
                }
            }, 500); // 500ms grace period for next chunk to arrive
            return;
        }

        console.log('🔊 Starting audio playback, queue length:', queueRef.current.length);
        isProcessingRef.current = true;
        setIsPlaying(true);

        const audioBuffer = queueRef.current.shift();
        if (!audioBuffer) return;

        try {
            const ctx = getAudioContext();
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            sourceRef.current = source;

            source.onended = () => {
                sourceRef.current = null;
                playNext(); // Recursively play next
            };

            source.start(0);
        } catch (error) {
            console.error("Error playing audio chunk:", error);
            playNext(); // Skip and try next
        }
    }, [getAudioContext]);

    const addToQueue = useCallback(async (base64Data: string) => {
        // Mark that we're receiving audio
        isReceivingRef.current = true;

        // Clear any pending "end of playback" timeout
        if (playbackEndTimeoutRef.current) {
            clearTimeout(playbackEndTimeoutRef.current);
            playbackEndTimeoutRef.current = null;
        }

        // Set isPlaying immediately when first chunk arrives
        setIsPlaying(true);

        try {
            const ctx = getAudioContext();
            // Convert base64 to array buffer
            const binaryString = window.atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Decode audio data
            const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
            queueRef.current.push(audioBuffer);
            console.log('🔊 Audio chunk decoded and added to queue, new length:', queueRef.current.length);

            if (!isProcessingRef.current) {
                console.log('🔊 Queue was idle, starting playback');
                playNext();
            }
        } catch (error) {
            console.error("Error decoding audio chunk:", error);
        }
    }, [getAudioContext, playNext]);

    // Call this when the stream is complete to allow playback to end
    const markStreamComplete = useCallback(() => {
        console.log('🔊 Stream marked complete - will stop after queue empties');
        isReceivingRef.current = false;
    }, []);

    const stop = useCallback(() => {
        queueRef.current = [];
        setIsPlaying(false);
        isProcessingRef.current = false;
        isReceivingRef.current = false;

        if (playbackEndTimeoutRef.current) {
            clearTimeout(playbackEndTimeoutRef.current);
            playbackEndTimeoutRef.current = null;
        }

        if (sourceRef.current) {
            try {
                sourceRef.current.stop();
            } catch (e) {
                // Ignore error if already stopped
            }
            sourceRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    // NOTE: We intentionally DON'T close the AudioContext here because:
    // 1. During HMR, the component remounts and tries to use the same context
    // 2. The context will be garbage collected naturally when the page unloads
    // 3. The getAudioContext function now handles creating a new context if the old one is closed
    useEffect(() => {
        return () => {
            // Clear any pending timeouts
            if (playbackEndTimeoutRef.current) {
                clearTimeout(playbackEndTimeoutRef.current);
            }
            // Stop any playing audio
            if (sourceRef.current) {
                try {
                    sourceRef.current.stop();
                } catch (e) {
                    // Ignore if already stopped
                }
            }
            // Clear the queue
            queueRef.current = [];
        };
    }, []);

    return {
        addToQueue,
        stop,
        isPlaying,
        markStreamComplete
    };
};

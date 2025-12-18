"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { QuickActions } from "./components/QuickActions";
import { VoiceControl } from "./components/VoiceControl";
import { Sidebar } from "./components/Sidebar";
import { SessionManager } from "./components/SessionManager";
import { ChatSection, Message } from "./components/ChatSection";
import ChatInput from "./components/ChatInput";
import { useWebSpeech } from "./hooks/useWebSpeech";
import { useAudioQueue } from "./hooks/useAudioQueue";
import { CaseContextBar, CaseContext } from "./components/CaseContextBar";
import { CaseSetup } from "./components/CaseSetup";



export default function Home() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [sessionState, setSessionState] = useState<"idle" | "active" | "paused">("idle");
  const [sessionId, setSessionId] = useState<string | null>(null); // Track session ID for memory
  const [inputMode, setInputMode] = useState<"text" | "voice">("text"); // Toggle between text and voice input
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("UgBBYS2sOqTuMpoF3BR0"); // Default to Mark voice
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const isStreamActiveRef = useRef(false); // Track if we're receiving a stream

  // Case context - required before starting session
  const [caseContext, setCaseContext] = useState<CaseContext | null>(null);
  const [isContextExpanded, setIsContextExpanded] = useState(false);

  const { addToQueue, stop: stopAudio, isPlaying: isAudioPlaying, markStreamComplete } = useAudioQueue();
  const [messages, setMessages] = useState<Message[]>([]);

  // Generate initial message based on case context
  const handleCaseSetupComplete = useCallback((context: CaseContext) => {
    setCaseContext(context);
    setMessages([{
      id: '1',
      role: 'assistant',
      content: `I'm ready to help with your ${context.caseType} case at the ${context.difficulty} level. ${context.uploadedFiles.length > 0 ? `I have access to ${context.uploadedFiles.length} document${context.uploadedFiles.length > 1 ? 's' : ''}.` : ''} How would you like to begin?`
    }]);
    setSessionState('active');
  }, []);

  const handleNewSession = () => {
    // Reset everything for new session
    setCaseContext(null);
    setMessages([]);
    setSessionId(null);
    setSessionState("idle");
    setIsContextExpanded(false);
  };

  const handleSelectSession = (id: string) => {
    // In a real app, fetch session messages here
    console.log("Loading session:", id);
    setSessionId(id);
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: `Loaded session history for session ${id}. (Mock data)`
    }]);
  };

  const handleSendMessage = async (content: string, pdfContextIds?: string[], attachments?: any[]) => {
    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      attachments
    };
    setMessages(prev => [...prev, userMsg]);

    // Add placeholder assistant message
    const assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: 'assistant',
      content: ""
    }]);

    // CRITICAL: Set isAiSpeaking IMMEDIATELY to mute mic before any audio arrives
    // This prevents the mic from picking up any ambient sound during the gap
    setIsAiSpeaking(true);
    isStreamActiveRef.current = true; // Mark stream as active

    try {
      // Build request body - include case context only on first message
      const requestBody: Record<string, unknown> = {
        message: content,
        agent_id: "legal_agent",
        user_id: "default_user",
        session_id: sessionId,
        voice_id: selectedVoiceId || undefined
      };

      // Send case context only on first message (when no sessionId exists)
      if (!sessionId && caseContext) {
        requestBody.case_context = {
          case_type: caseContext.caseType,
          difficulty: caseContext.difficulty,
          description: caseContext.description,
          uploaded_files: caseContext.uploadedFiles.map(f => f.name)
        };
      }

      const response = await fetch("http://localhost:8000/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok || !response.body) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last part in buffer as it might be incomplete
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            try {
              const data = JSON.parse(line.trim().slice(6));

              if (data.type === 'session' && data.session_id) {
                // Store session ID for future messages - this enables memory!
                setSessionId(data.session_id);
                console.log('📝 Session ID:', data.session_id);
              } else if (data.type === 'content') {
                accumulatedContent += data.content;
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: accumulatedContent }
                    : msg
                ));
              } else if (data.type === 'audio') {
                // Add audio chunk to queue (isAiSpeaking is controlled by audio playback)
                console.log('🎵 Adding audio chunk to queue');
                addToQueue(data.data);
              } else if (data.type === 'tool_call') {
                console.log('🔧 Tool call:', data.tool_name);
                // Update the message with the active tool
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMsgId
                    ? { ...msg, toolCall: data.tool_name }
                    : msg
                ));
              } else if (data.type === 'done') {
                console.log('✅ Stream complete');
                // Mark stream as complete so audio queue knows no more chunks are coming
                markStreamComplete();
                isStreamActiveRef.current = false; // Stream is done
                // If no voice selected (text mode), we can release isAiSpeaking now
                if (!selectedVoiceId) {
                  setIsAiSpeaking(false);
                }
              } else if (data.type === 'error') {
                console.error('❌ Error:', data.error);
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: `Error: ${data.error}` }
                    : msg
                ));
              }
            } catch (e) {
              console.error("Error parsing JSON chunk:", e);
              // Gracefully skip bad chunks
            }
          }
        }
      }
    } catch (err) {
      console.error("Request failed:", err);
      isStreamActiveRef.current = false; // Stream ended due to error
      setIsAiSpeaking(false); // Reset on error
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMsgId
          ? { ...msg, content: "Sorry, I encountered an error." }
          : msg
      ));
    }
    // Don't use finally - let the audio queue control when to stop muting the mic
  };

  // Sync isAiSpeaking with actual audio playback when voice is selected
  // This ensures mic stays muted for the entire duration of audio playback
  // BUT only allow isAiSpeaking to go false if stream is also complete
  useEffect(() => {
    if (selectedVoiceId) {
      console.log('🎵 Audio playback state changed:', isAudioPlaying ? 'PLAYING' : 'STOPPED');

      if (isAudioPlaying) {
        // Audio is playing - definitely keep mic muted
        setIsAiSpeaking(true);
      } else if (!isStreamActiveRef.current) {
        // Audio stopped AND stream is complete - safe to unmute
        console.log('🎤 Stream complete and audio stopped - allowing unmute');
        setIsAiSpeaking(false);
      } else {
        console.log('🎤 Audio stopped but stream still active - keeping mic muted');
      }
    }
  }, [isAudioPlaying, selectedVoiceId]);

  // Track if we should accept speech - use ref to avoid stale closures
  const shouldAcceptSpeechRef = useRef(true);
  const micCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const wasAiSpeakingRef = useRef(false);

  // Update the ref whenever isAiSpeaking or isAudioPlaying changes
  useEffect(() => {
    shouldAcceptSpeechRef.current = !isAiSpeaking && !isAudioPlaying;
    console.log('🎤 Should accept speech:', shouldAcceptSpeechRef.current, '(isAiSpeaking:', isAiSpeaking, ', isAudioPlaying:', isAudioPlaying, ')');
  }, [isAiSpeaking, isAudioPlaying]);

  // STABLE callback - use useCallback to prevent hook reinitialization
  const handleFinalSpeech = useCallback((transcript: string) => {
    // CRITICAL: Reject any speech while AI is speaking or audio is playing
    // This prevents the mic from picking up AI responses
    if (!shouldAcceptSpeechRef.current) {
      console.log('🚫 REJECTING transcript (AI is speaking):', transcript);
      return;
    }

    if (transcript.trim()) {
      console.log('✅ ACCEPTING transcript:', transcript);
      handleSendMessage(transcript);
    }
  }, []); // Empty deps - uses ref for state

  const { isListening, startListening, stopListening, interimTranscript } = useWebSpeech({
    onFinalTranscript: handleFinalSpeech,
    continuous: true
  });

  // Manage voice state based on session and mode
  // CRITICAL: This is the HARD GATING logic - mic OFF when AI speaks, with cooldown
  useEffect(() => {
    // Clear any pending cooldown
    if (micCooldownRef.current) {
      clearTimeout(micCooldownRef.current);
      micCooldownRef.current = null;
    }

    console.log('🎤 Mic state check - isAiSpeaking:', isAiSpeaking, 'sessionState:', sessionState);

    // HARD STOP: If AI is speaking, KILL the mic immediately
    if (isAiSpeaking) {
      console.log('🔇 HARD MUTING MIC - AI is speaking');
      wasAiSpeakingRef.current = true;
      stopListening();
      return;
    }

    // AI just stopped speaking - add cooldown before re-enabling
    if (wasAiSpeakingRef.current) {
      console.log('⏳ AI stopped - waiting 500ms cooldown before unmuting mic');
      wasAiSpeakingRef.current = false;

      micCooldownRef.current = setTimeout(() => {
        if (inputMode === "voice" && sessionState === "active" && !isAiSpeaking) {
          console.log('🎤 Cooldown complete - UNMUTING MIC');
          startListening();
        }
      }, 500); // 500ms cooldown to let audio echoes dissipate
      return;
    }

    // Normal mic management (no cooldown needed)
    if (inputMode === "voice" && sessionState === "active") {
      console.log('🎤 UNMUTING MIC - Ready to listen');
      startListening();
    } else {
      console.log('🔇 MUTING MIC - Not in active voice session');
      stopListening();
    }

    // Cleanup cooldown on unmount
    return () => {
      if (micCooldownRef.current) {
        clearTimeout(micCooldownRef.current);
      }
    };
  }, [inputMode, sessionState, isAiSpeaking, startListening, stopListening]);


  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <Sidebar
        isExpanded={isSidebarExpanded}
        onToggle={setIsSidebarExpanded}
        onVoiceSelect={setSelectedVoiceId} // Pass selection handler
      />

      <div
        className={`min-h-screen transition-all duration-300 ease-in-out ${isSidebarExpanded ? "pl-72" : "pl-20"
          }`}
      >
        {/* Top Bar with Session Manager */}
        <div className="fixed top-0 right-0 left-0 z-30 flex items-center justify-between px-6 py-4"
          style={{ left: isSidebarExpanded ? '288px' : '80px' }}>
          <SessionManager
            onNewSession={handleNewSession}
            onSelectSession={handleSelectSession}
          />
        </div>

        <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center p-8 pt-32 relative">
          <div className="relative mx-auto flex w-full flex-col items-center justify-center gap-6 text-center h-[calc(100vh-280px)]">

            {/* Show CaseSetup if no context defined */}
            {!caseContext ? (
              <CaseSetup onComplete={handleCaseSetupComplete} />
            ) : (
              <>
                {/* Case Context Bar - above chat */}
                <CaseContextBar
                  context={caseContext}
                  isExpanded={isContextExpanded}
                  onToggle={() => setIsContextExpanded(!isContextExpanded)}
                />

                {/* Chat Section */}
                <ChatSection messages={messages} interimTranscript={interimTranscript} />

                {/* Input Mode Toggle Area */}
                {inputMode === "text" ? (
                  <div className="w-full relative z-20">
                    <ChatInput
                      onSendMessage={handleSendMessage}
                      onModeToggle={() => setInputMode("voice")}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full z-10 gap-6">
                    <VoiceControl mode={
                      isAiSpeaking
                        ? "ai-speaking"
                        : sessionState === "active"
                          ? (interimTranscript ? "user-speaking" : "listening")
                          : "idle"
                    } />

                    {/* Dock with session controls and mode switch in voice mode */}
                    <QuickActions
                      sessionState={sessionState}
                      onStartSession={() => setSessionState("active")}
                      onPauseSession={() => setSessionState("paused")}
                      onResumeSession={() => setSessionState("active")}
                      onEndSession={() => setSessionState("idle")}
                      onNewSession={() => setSessionState("idle")}
                      onSwitchToTextMode={() => setInputMode("text")}
                    />
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}

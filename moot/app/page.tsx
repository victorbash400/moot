"use client";

import { useState, useRef, useEffect } from "react";
import { QuickActions } from "./components/QuickActions";
import { VoiceControl } from "./components/VoiceControl";
import { Sidebar } from "./components/Sidebar";
import { SessionManager } from "./components/SessionManager";
import ChatBubble from "./components/ChatBubble";
import ChatInput from "./components/ChatInput";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: any[];
  citations?: string[];
}

export default function Home() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [sessionState, setSessionState] = useState<"idle" | "active" | "paused">("idle");
  const [sessionId, setSessionId] = useState<string | null>(null); // Track session ID for memory
  const [inputMode, setInputMode] = useState<"text" | "voice">("text"); // Toggle between text and voice input
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Present your opening argument on whether the contract's arbitration clause is unconscionable under state law."
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Only scroll if we added a new message or it's the very start
    // For streaming updates (content changes), we usually don't want to force scroll constantly 
    // unless we are already at the bottom, but smooth scroll on every chunk causes jitter.
    // Changing to only scroll on new message addition or first load.
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'user' || messages.length === 1) {
      scrollToBottom();
    }
  }, [messages.length]); // Only trigger on count change, not content change

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

    try {
      const response = await fetch("http://localhost:8000/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: content,
          agent_id: "legal_agent",
          user_id: "default_user",
          session_id: sessionId // Reuse session ID for memory!
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

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
            } else if (data.type === 'tool_call') {
              console.log('🔧 Tool call:', data.tool_name);
            } else if (data.type === 'done') {
              console.log('✅ Stream complete');
            } else if (data.type === 'error') {
              console.error('❌ Error:', data.error);
              setMessages(prev => prev.map(msg =>
                msg.id === assistantMsgId
                  ? { ...msg, content: `Error: ${data.error}` }
                  : msg
              ));
            }
          }
        }
      }

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMsgId
          ? { ...msg, content: "Sorry, I encountered an error." }
          : msg
      ));
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <Sidebar isExpanded={isSidebarExpanded} onToggle={setIsSidebarExpanded} />

      <div
        className={`min-h-screen transition-all duration-300 ease-in-out ${isSidebarExpanded ? "pl-72" : "pl-20"
          }`}
      >
        {/* Top Bar with Session Manager */}
        <div className="fixed top-0 right-0 left-0 z-30 flex items-center justify-between px-6 py-4"
          style={{ left: isSidebarExpanded ? '288px' : '80px' }}>
          <SessionManager />
        </div>

        <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center p-8 pt-32 relative">
          <div className="relative mx-auto flex w-full flex-col items-center justify-center gap-6 text-center h-[calc(100vh-280px)]">

            {/* Glassy Chat Container - Wraps ChatBubbles */}
            <div className="relative border border-[#d4c5b0]/40 rounded-2xl bg-[#fdfbf7]/50 backdrop-blur-sm w-full h-full flex flex-col overflow-hidden shadow-sm">
              <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6 p-8">
                {messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    attachments={msg.attachments}
                    citations={msg.citations}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

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
                <VoiceControl state={sessionState === "active" ? "recording" : "idle"} />

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

          </div>

        </div>
      </div>
    </main>
  );
}

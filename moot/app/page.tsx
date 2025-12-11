"use client";

import { useState } from "react";
import { QuickActions } from "./components/QuickActions";
import { VoiceControl } from "./components/VoiceControl";
import { Sidebar } from "./components/Sidebar";
import { SessionManager } from "./components/SessionManager";
import Aurora from "./components/Aurora";

const samplePrompt =
  "Present your opening argument on whether the contract's arbitration clause is unconscionable under state law.";

export default function Home() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [sessionState, setSessionState] = useState<"idle" | "active" | "paused">("idle");

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      {/* Aurora Background */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <Aurora 
          colorStops={['#1e40af', '#4f46e5', '#6366f1']}
          amplitude={0.8}
          blend={0.6}
          speed={0.5}
        />
      </div>

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

        <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center p-6 pt-24 relative">
          <div className="relative flex w-full max-w-4xl flex-col gap-16 px-8">

            <div className="relative mx-auto flex w-full flex-col items-center justify-center gap-12 text-center">

              {/* Content Display Area - for responses, tool calls, etc */}
              <div className="space-y-6 w-full">
                <div className="relative">
                  <div className="relative border border-gray-200/40 rounded-2xl p-8 bg-white/30 backdrop-blur-sm min-h-[300px] flex items-center justify-center">
                    <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-indigo-400/60 animate-pulse"></div>
                    <div className="absolute top-4 left-8 w-2 h-2 rounded-full bg-purple-400/60 animate-pulse delay-75"></div>
                    <div className="absolute top-4 left-12 w-2 h-2 rounded-full bg-blue-400/60 animate-pulse delay-150"></div>
                    
                    <h1 className="text-xl md:text-2xl font-light tracking-tight text-gray-800 leading-relaxed max-w-2xl mx-auto mt-4">
                      {samplePrompt}
                    </h1>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center w-full mt-4">
                <VoiceControl state={sessionState === "active" ? "recording" : "idle"} />
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <QuickActions 
              sessionState={sessionState}
              onStartSession={() => setSessionState("active")}
              onPauseSession={() => setSessionState("paused")}
              onResumeSession={() => setSessionState("active")}
              onEndSession={() => setSessionState("idle")}
              onNewSession={() => setSessionState("idle")}
            />
          </div>

        </div>
      </div>
    </main>
  );
}

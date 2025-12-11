'use client';

import { FC, useState } from "react";
import { Plus, ChevronDown, Clock } from "lucide-react";

type Session = {
  id: string;
  title: string;
  timestamp: string;
  duration: string;
};

type SessionManagerProps = {
  currentSession?: Session;
  sessions?: Session[];
  onNewSession?: () => void;
  onSelectSession?: (sessionId: string) => void;
};

export const SessionManager: FC<SessionManagerProps> = ({
  currentSession,
  sessions = [
    { id: "1", title: "Contract Arbitration", timestamp: "2 hours ago", duration: "23 min" },
    { id: "2", title: "Criminal Defense", timestamp: "Yesterday", duration: "45 min" },
    { id: "3", title: "Civil Rights Case", timestamp: "2 days ago", duration: "31 min" },
  ],
  onNewSession,
  onSelectSession
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        {/* New Session Button */}
        <button
          onClick={onNewSession}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/60 rounded-xl hover:bg-white/80 transition-all shadow-sm hover:shadow-md"
        >
          <Plus size={18} className="text-gray-700" />
          <span className="text-sm font-medium text-gray-700">New Session</span>
        </button>

        {/* Current Session / History Dropdown */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-4 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/60 rounded-xl hover:bg-white/80 transition-all shadow-sm hover:shadow-md min-w-[200px]"
        >
          <Clock size={16} className="text-gray-600" />
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-gray-900">
              {currentSession?.title || "Current Session"}
            </div>
            {currentSession?.timestamp && (
              <div className="text-xs text-gray-500">{currentSession.timestamp}</div>
            )}
          </div>
          <ChevronDown size={16} className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[320px] bg-white/95 backdrop-blur-lg border border-gray-200/60 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Recent Sessions
            </div>
            <div className="space-y-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    onSelectSession?.(session.id);
                    setIsOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-600">
                        {session.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {session.timestamp} • {session.duration}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

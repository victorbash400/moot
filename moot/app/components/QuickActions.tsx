'use client';

import { FC } from "react";
import Dock from "./Dock";
import { Mic, Pause, RotateCcw, StopCircle } from "lucide-react";

type SessionState = "idle" | "active" | "paused";

type QuickActionsProps = {
  sessionState?: SessionState;
  onStartSession?: () => void;
  onPauseSession?: () => void;
  onResumeSession?: () => void;
  onEndSession?: () => void;
  onNewSession?: () => void;
  onSwitchToTextMode?: () => void;
};

export const QuickActions: FC<QuickActionsProps> = ({ 
  sessionState = "idle",
  onStartSession, 
  onPauseSession,
  onResumeSession,
  onEndSession,
  onNewSession,
  onSwitchToTextMode
}) => {
  const getActions = () => {
    const baseActions = [];
    
    if (sessionState === "idle") {
      baseActions.push(
        {
          icon: <Mic size={20} className="text-gray-700" />,
          label: "Start Session",
          onClick: () => onStartSession?.(),
        }
      );
    }
    else if (sessionState === "paused") {
      baseActions.push(
        {
          icon: <Mic size={20} className="text-gray-700" />,
          label: "Resume",
          onClick: () => onResumeSession?.(),
        },
        {
          icon: <StopCircle size={20} className="text-gray-700" />,
          label: "End Session",
          onClick: () => onEndSession?.(),
        },
        {
          icon: <RotateCcw size={20} className="text-gray-700" />,
          label: "New Session",
          onClick: () => onNewSession?.(),
        }
      );
    }
    else {
      // active
      baseActions.push(
        {
          icon: <Pause size={20} className="text-gray-700" />,
          label: "Pause",
          onClick: () => onPauseSession?.(),
        },
        {
          icon: <StopCircle size={20} className="text-gray-700" />,
          label: "End Session",
          onClick: () => onEndSession?.(),
        }
      );
    }
    
    // Add text mode switch to all states
    if (onSwitchToTextMode) {
      baseActions.push({
        icon: (
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        ),
        label: "Text Mode",
        onClick: () => onSwitchToTextMode(),
      });
    }
    
    return baseActions;
  };

  return (
    <div className="flex items-center justify-center w-full">
      <Dock
        items={getActions()}
        panelHeight={68}
        baseItemSize={50}
        magnification={70}
      />
    </div>
  );
};

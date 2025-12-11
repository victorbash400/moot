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
};

export const QuickActions: FC<QuickActionsProps> = ({ 
  sessionState = "idle",
  onStartSession, 
  onPauseSession,
  onResumeSession,
  onEndSession,
  onNewSession 
}) => {
  const getActions = () => {
    if (sessionState === "idle") {
      return [
        {
          icon: <Mic size={20} className="text-gray-700" />,
          label: "Start Session",
          onClick: () => onStartSession?.(),
        }
      ];
    }
    
    if (sessionState === "paused") {
      return [
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
      ];
    }
    
    // active
    return [
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
    ];
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

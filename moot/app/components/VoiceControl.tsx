'use client';

import { FC, useEffect, useState } from "react";
import { motion } from "motion/react";

type VoiceControlProps = {
  mode: "ai-speaking" | "user-speaking" | "listening" | "idle";
};

export const VoiceControl: FC<VoiceControlProps> = ({ mode }) => {
  const [bars, setBars] = useState<number[]>(Array(13).fill(0.15));

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (mode === "user-speaking") {
      // High energy, random rapid movement for user speech
      interval = setInterval(() => {
        setBars(prev => prev.map(() => Math.max(0.2, Math.random())));
      }, 80);
    } else if (mode === "ai-speaking") {
      // Smooth sine wave for AI speech
      let time = 0;
      interval = setInterval(() => {
        time += 0.2;
        setBars(prev => prev.map((_, i) => {
          // Create a flowing sine wave
          const val = Math.sin(time + i * 0.5);
          // Map [-1, 1] to [0.2, 0.9]
          return 0.55 + val * 0.35;
        }));
      }, 50);
    } else if (mode === "listening") {
      // Gentle breathing/pulsing for listening
      let time = 0;
      interval = setInterval(() => {
        time += 0.05;
        setBars(prev => prev.map((_, i) => {
          // Slow breathing
          const val = Math.sin(time);
          return 0.3 + val * 0.1; // [0.2, 0.4]
        }));
      }, 50);
    } else {
      // Idle - flat
      setBars(Array(13).fill(0.15));
    }

    return () => clearInterval(interval);
  }, [mode]);

  // Determine bar color based on mode
  const getBarColor = () => {
    switch (mode) {
      case "ai-speaking":
        return "bg-[var(--accent)]"; // Lawyery bronze
      case "user-speaking":
        return "bg-indigo-600";
      case "listening":
        return "bg-[var(--muted)]";
      default:
        return "bg-gray-300";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full">
      {/* Voice Visualization Bars */}
      <div className="flex items-center justify-center gap-1.5 h-20 w-full max-w-xs transition-opacity duration-500">
        {bars.map((height, i) => (
          <motion.div
            key={i}
            className={`w-1.5 rounded-full transition-colors duration-300 ${getBarColor()}`}
            animate={{
              height: `${height * 100}%`,
            }}
            transition={{
              // Use different transition physics for different modes
              duration: mode === "ai-speaking" ? 0.4 : 0.1,
              ease: mode === "ai-speaking" ? "linear" : "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Status Text */}
      <div className="h-6 flex items-center justify-center">
        <span className={`text-sm font-medium transition-all duration-300 ${mode === "ai-speaking" ? "text-[var(--accent)]" : "text-[var(--muted)]"
          }`}>
          {mode === "ai-speaking" && "Counsel is speaking..."}
          {mode === "user-speaking" && "Listening..."}
          {mode === "listening" && "Listening..."}
        </span>
      </div>
    </div>
  );
};

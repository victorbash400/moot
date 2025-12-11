'use client';

import { FC, useEffect, useState } from "react";
import { motion } from "motion/react";

type VoiceControlProps = {
  state: "idle" | "recording" | "review";
};

export const VoiceControl: FC<VoiceControlProps> = ({ state }) => {
  const [bars, setBars] = useState<number[]>(Array(13).fill(0));

  useEffect(() => {
    if (state === "recording") {
      const interval = setInterval(() => {
        setBars(prev => prev.map(() => Math.random()));
      }, 100);
      return () => clearInterval(interval);
    } else {
      // Flat/minimal bars when idle
      setBars(Array(13).fill(0.15));
    }
  }, [state]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full">
      {/* Voice Visualization Bars */}
      <div className="flex items-center justify-center gap-1.5 h-20 w-full max-w-xs">
        {bars.map((height, i) => (
          <motion.div
            key={i}
            className={`w-1.5 rounded-full ${
              state === "recording" ? "bg-indigo-500" : "bg-gray-400"
            }`}
            animate={{
              height: `${height * 100}%`,
            }}
            transition={{
              duration: 0.15,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  );
};

"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function InfoPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/moot_clean.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      />



      {/* Button Container - Bottom Center */}
      <div className="relative z-20 flex flex-col items-center justify-end min-h-screen pb-20">
        <Link
          href="/chat"
          className="group inline-flex items-center gap-3 px-8 py-4 bg-white/30 backdrop-blur-md hover:bg-white/40 border border-white/30 text-white text-lg font-semibold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-indigo-500/20"
        >
          Start New Session
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </main>
  );
}

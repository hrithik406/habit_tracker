"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LevelData {
  newLevel: number;
  prevLevel: number;
}

export default function LevelUpPopup() {
  const [levelData, setLevelData] = useState<LevelData | null>(null);

  // 1. Listen for the global event from ANY page
  useEffect(() => {
    const handleLevelUp = (e: Event) => {
      const customEvent = e as CustomEvent<LevelData>;
      setLevelData(customEvent.detail);
    };

    window.addEventListener("level-up", handleLevelUp);
    return () => window.removeEventListener("level-up", handleLevelUp);
  }, []);

  // 2. The 5-Second Timer
  useEffect(() => {
    if (levelData) {
      const timer = setTimeout(() => {
        setLevelData(null); // Hide it after 5 seconds!
      }, 5000);

      // Cleanup if the component unmounts before 5 seconds
      return () => clearTimeout(timer);
    }
  }, [levelData]);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center pointer-events-none px-4">
      <AnimatePresence>
        {levelData && (
          <motion.div
            key="level-up-modal"
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -50 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="bg-slate-900 border-2 border-violet-500 rounded-3xl p-8 text-center max-w-sm w-full shadow-[0_0_50px_rgba(124,58,237,0.4)] relative overflow-hidden"
          >
            {/* Cool background shine */}
            <div className="absolute inset-0 bg-linear-to-tr from-violet-600/20 to-transparent pointer-events-none" />

            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-24 h-24 mx-auto bg-slate-800 border-4 border-violet-500 rounded-full flex items-center justify-center text-5xl mb-6 shadow-inner"
            >
              👑
            </motion.div>

            <h2 className="text-3xl font-black text-white mb-2 tracking-tight uppercase">
              Level Up!
            </h2>
            
            <p className="text-slate-300 mb-6 text-lg">
              You reached Level <span className="font-bold text-violet-400">{levelData.newLevel}</span>
            </p>

            {/* Progress visual */}
            <div className="flex items-center justify-center gap-4 text-2xl font-black">
              <span className="text-slate-500">{levelData.prevLevel}</span>
              <span className="text-violet-500">➡️</span>
              <span className="text-violet-400 text-4xl">{levelData.newLevel}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
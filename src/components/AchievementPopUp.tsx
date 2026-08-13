"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAchievementById } from "@/../shared/achievement"; // ⬅️ Imported the static achievement data


export default function AchievementPopup() {
  const [queue, setQueue] = useState<string[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // 1. Listen for the custom event from ANYWHERE in the app
  useEffect(() => {
    const handleUnlock = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      const unlockedIds = customEvent.detail;
      setQueue((prev) => [...prev, ...unlockedIds]);
    };

    window.addEventListener("achievement-unlocked", handleUnlock);
    return () => window.removeEventListener("achievement-unlocked", handleUnlock);
  }, []);

  // 2. Queue Manager: If nothing is showing and we have items in queue, show the next one!
  useEffect(() => {
    if (queue.length > 0 && !currentId) {
      setCurrentId(queue[0]); // Show the first one
      setQueue((prev) => prev.slice(1)); // Remove it from the queue
    }
  }, [queue, currentId]);

  // 3. The Timer: ONLY handles hiding the active popup after 4 seconds
  useEffect(() => {
    if (currentId) {
      const timer = setTimeout(() => {
        setCurrentId(null); // Hide it
      }, 4000);

      // This cleanup will only run when the timer finishes or the component unmounts
      return () => clearTimeout(timer);
    }
  }, [currentId]);

  const achievement = currentId ? getAchievementById(currentId) : null;

  return (
    <div className="fixed top-6 left-0 right-0 z-100 flex justify-center pointer-events-none px-4">
      <AnimatePresence>
        {currentId && achievement && (
          <motion.div
            key={currentId}
            initial={{ y: -100, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="bg-slate-900 border border-yellow-500/50 shadow-[0_0_40px_rgba(234,179,8,0.3)] rounded-2xl p-4 flex items-center gap-4 w-full max-w-sm relative overflow-hidden"
          >
            {/* Animated Shine Effect */}
            <div className="absolute inset-0 w-[200%] bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />

            {/* Icon */}
            <div className="w-14 h-14 bg-slate-800 border-2 border-yellow-500/30 rounded-xl flex items-center justify-center text-3xl shrink-0 shadow-inner">
              {achievement.icon}
            </div>

            {/* Text Payload */}
            <div className="flex-1">
              <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-0.5">
                Achievement Unlocked
              </p>
              <h4 className="text-white font-bold text-lg leading-tight">
                {achievement.title}
              </h4>
              <p className="text-slate-400 text-xs mt-0.5">
                {achievement.desc}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
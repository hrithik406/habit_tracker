"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext"; 
import { ACHIEVEMENTS_DATA } from "@/../shared/achievement"; 

export default function AchievementsPage() {
  // 1. Grab dispatch so we can instantly update the user's Gold & XP
  const { user, dispatch } = useApp(); 
  
  // 2. Track which button is currently loading
  const [claimingId, setClaimingId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate totals dynamically
  const totalAchievements = ACHIEVEMENTS_DATA.reduce((acc, cat) => acc + cat.items.length, 0);
  const unlockedCount = user.unlockedAchievements?.length || 0;
  const progressPercent = Math.round((unlockedCount / totalAchievements) * 100) || 0;

// ── THE CLAIM FUNCTION ──
  const handleClaim = async (achievementId: string) => {
    setClaimingId(achievementId);

    try {
      const res = await fetch(`http://localhost:5000/api/users/${user._id}/achievements/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achievementId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to claim");
      }

      const data = await res.json();
      
      // ⬇️ NEW: Trigger the Level Up Popup! ⬇️
      // We check the awardResult that the backend sent us
      if (data.awardResult && data.awardResult.leveledUp) {
        window.dispatchEvent(new CustomEvent("level-up", {
          detail: {
            newLevel: data.awardResult.newLevel,
            prevLevel: data.awardResult.prevLevel
          }
        }));
      }

      // OPTIMISTIC UI: Instantly update global state with the new User data!
      dispatch({ type: "UPDATE_USER", payload: data.user });

    } catch (error: any) {
      console.error(error);
      alert(error.message || "Something went wrong claiming your reward.");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-10 pb-32">
      
      {/* ── Header & Progress ── */}
      <header className="space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Hall of Triumphs</h1>
          <p className="text-slate-400 mt-1">Unlock rare badges, avatars, and massive XP bonuses.</p>
        </div>

        {/* Global Progress Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Completion</p>
              <p className="text-2xl font-black text-white">{unlockedCount} <span className="text-slate-500 text-lg">/ {totalAchievements}</span></p>
            </div>
            <div className="text-right">
              <span className="text-violet-400 font-bold text-xl">{progressPercent}%</span>
            </div>
          </div>
          <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-linear-to-r from-violet-600 to-yellow-500 rounded-full relative"
            >
              <div className="absolute top-0 left-0 bottom-0 right-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </motion.div>
          </div>
        </div>
      </header>

      {/* ── Categories ── */}
      <div className="space-y-12">
        {ACHIEVEMENTS_DATA.map((category, catIdx) => (
          <div key={catIdx} className="space-y-6">
            
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">
              {category.category}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.items.map((achievement, idx) => {
                
                // 4. SMART CHECK: Look up the exact record to check if it's claimed!
                const unlockedRecord = user.unlockedAchievements?.find((a: any) => a.achievementId === achievement.id);
                const isUnlocked = !!unlockedRecord;
                const isClaimed = unlockedRecord?.isClaimed || false;
                const isWaitingToClaim = isUnlocked && !isClaimed;

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={achievement.id}
                    className={`relative p-5 rounded-2xl border transition-all duration-300 ${
                      isWaitingToClaim
                        ? "bg-slate-900 border-yellow-500/80 shadow-[0_0_30px_rgba(234,179,8,0.2)] scale-[1.02]" // Glows Gold if waiting to claim!
                        : isUnlocked 
                        ? "bg-slate-900 border-violet-500/30 hover:border-violet-400 hover:-translate-y-1" // Normal unlocked styling
                        : "bg-slate-950 border-slate-800 opacity-70 grayscale hover:grayscale-0 hover:opacity-100" // Locked styling
                    }`}
                  >
                    
                    {/* ── THE STATUS / CLAIM BUTTON CORNER ── */}
                    <div className="absolute top-4 right-4 text-sm z-10">
                      {!isUnlocked && (
                        <span className="text-slate-600 text-lg">🔒</span>
                      )}
                      {isUnlocked && isClaimed && (
                        <span className="text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-md font-bold text-xs">
                          Claimed ✅
                        </span>
                      )}
                      {isWaitingToClaim && (
                        <button
                          onClick={() => handleClaim(achievement.id)}
                          disabled={claimingId === achievement.id}
                          className="bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-black px-3 py-1.5 rounded-md text-xs tracking-wide shadow-[0_0_15px_rgba(234,179,8,0.6)] transition-all animate-pulse hover:animate-none active:scale-95 disabled:opacity-50 disabled:animate-none"
                        >
                          {claimingId === achievement.id ? "CLAIMING..." : "CLAIM REWARD!"}
                        </button>
                      )}
                    </div>

                    <div className="flex items-start gap-4 mb-4 mt-2">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0 ${
                        isWaitingToClaim ? "bg-slate-800 border-2 border-yellow-500"
                        : isUnlocked ? "bg-slate-800 border-2 border-violet-500/30" 
                        : "bg-slate-900 border border-slate-800"
                      }`}>
                        {achievement.icon}
                      </div>
                      <div className="pr-12">
                        <h3 className={`font-black text-lg ${isUnlocked ? "text-white" : "text-slate-400"}`}>
                          {achievement.title}
                        </h3>
                        <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                          {achievement.desc}
                        </p>
                      </div>
                    </div>

                    <div className={`pt-3 border-t ${isWaitingToClaim ? "border-yellow-500/30" : isUnlocked ? "border-violet-500/20" : "border-slate-800"} flex flex-wrap items-center gap-3`}>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Rewards:</span>
                      
                      {achievement.xp > 0 && (
                        <span className={`text-xs font-bold flex items-center gap-1 ${isUnlocked ? "text-violet-400" : "text-slate-600"}`}>
                          ✨ {achievement.xp}
                        </span>
                      )}
                      
                      {achievement.gold > 0 && (
                        <span className={`text-xs font-bold flex items-center gap-1 ${isUnlocked ? "text-yellow-400" : "text-slate-600"}`}>
                          🪙 {achievement.gold}
                        </span>
                      )}

                      {achievement.rewardText && (
                        <span className={`text-xs font-bold flex items-center gap-1 px-2 py-0.5 rounded ${
                          isUnlocked ? "bg-rose-500/20 text-rose-400" : "bg-slate-800 text-slate-500"
                        }`}>
                          🎁 {achievement.rewardText}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
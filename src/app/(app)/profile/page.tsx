"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { getItemIcon, getCosmetics } from "@/../shared/item"; // ⬅️ Centralized helpers!

function getLevelTitle(level: number): string {
  if (level < 5) return "Beginner";
  if (level < 10) return "Rookie";
  if (level < 20) return "Challenger";
  if (level < 30) return "Advanced";
  if (level < 40) return "Professional";
  if (level < 50) return "Master";
  if (level < 75) return "Legend";
  if (level < 100) return "Titan";
  return "Immortal";
}

export default function ProfilePage() {
  // ⬇️ 1. Grabbed dispatch for the Optimistic UI update
  const { user, dispatch } = useApp(); 

  // ── Local UI State ──
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");

  const [activeAvatarId, setActiveAvatarId] = useState<string>("default");
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // We track exactly 4 slots. If null, the slot is empty.
  const [showcase, setShowcase] = useState<(string | null)[]>([null, null, null, null]);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  // Initialize local state once user loads
  useEffect(() => {
    if (user) {
      setDraftName(user.username || "HabitMaster");

      const avatarItem = user.ownedRewards?.find((r: any) => r.itemId.startsWith("avatar_"));
      setActiveAvatarId(user.activeAvatar || avatarItem?.itemId || "default" );

      // Auto-fill showcase with first 4 badges if they haven't explicitly set them
      const ownedBadges = user.ownedRewards?.filter((r: any) => r.itemId.startsWith("badge_")) || [];
      setShowcase([
        ownedBadges[0]?.itemId || null,
        ownedBadges[1]?.itemId || null,
        ownedBadges[2]?.itemId || null,
        ownedBadges[3]?.itemId || null,
      ]);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  const levelTitle = getLevelTitle(user.level || 1);
  
  // ⬇️ 2. Smart Icon Fetching for the main profile picture!
  const currentAvatarIcon = getItemIcon(activeAvatarId);

  // ⬇️ 3. Smart Cosmetic Fetching for the Modals!
  const allCosmetics = getCosmetics();
  const userOwnedCosmetics = allCosmetics.filter(cosmetic => 
    user.ownedRewards?.some((reward: any) => reward.itemId === cosmetic.id)
  );

  // ── Handlers ──
  const saveProfileToDatabase = async (updates: { username?: string, activeAvatar?: string, showcase?: (string | null)[] }) => {
    
    // 1. Remember how many achievements the user had BEFORE saving
    const previousAchievementCount = user.unlockedAchievements?.length || 0;

    // 2. OPTIMISTIC UI: Instantly updates the TopHeader before the database even responds!
    dispatch({ type: "UPDATE_USER", payload: { ...user, ...updates } });

    try {
      // Send the PUT request to your Express server
      const res = await fetch(`http://localhost:5000/api/users/${user._id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Failed to save profile");

      // 3. GET THE REAL DATA BACK FROM THE SERVER!
      const data = await res.json();
      
      // 4. Update global state with the true database state (which includes the new achievement!)
      dispatch({ type: "UPDATE_USER", payload: data.user });

      // 5. ⬇️ CHECK IF THEY GOT THE FASHIONISTA ACHIEVEMENT ⬇️
      const newAchievementCount = data.user.unlockedAchievements?.length || 0;
      
      if (newAchievementCount > previousAchievementCount) {
        // Find the exact ID of the newest achievement (the last one in the array)
        const newestAchievementId = data.user.unlockedAchievements[newAchievementCount - 1].achievementId;
        
        // FIRE THE POPUP! 🚀
        window.dispatchEvent(new CustomEvent("achievement-unlocked", { 
          detail: [newestAchievementId] 
        }));
      }

    } catch (error) {
      console.error(error);
      alert("Something went wrong saving your profile!");
    }
  };

  const handleSaveName = () => {
    setIsEditingName(false);
    saveProfileToDatabase({ username: draftName });
  };

  const handleSelectAvatar = (itemId: string) => {
    setActiveAvatarId(itemId);
    setIsAvatarModalOpen(false);
    saveProfileToDatabase({ activeAvatar: itemId });
  };

  const handleSelectShowcaseBadge = (itemId: string | null) => {
    if (editingSlotIndex !== null) {
      const newShowcase = [...showcase];
      newShowcase[editingSlotIndex] = itemId;
      setShowcase(newShowcase);
      setEditingSlotIndex(null);
      saveProfileToDatabase({ showcase: newShowcase });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-32">
      <header>
        <h1 className="text-3xl font-black text-white tracking-tight">Player Profile</h1>
        <p className="text-slate-400 text-sm mt-1">Your digital legacy and achievements.</p>
      </header>

      {/* ── Main Identity Card ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-10 overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">

          {/* Avatar Ring */}
          <div className="relative group cursor-pointer" onClick={() => setIsAvatarModalOpen(true)}>
            <div className="w-32 h-32 bg-slate-800 rounded-full border-4 border-slate-700 flex items-center justify-center text-6xl shadow-[0_0_30px_rgba(124,58,237,0.2)] transition-transform group-hover:scale-105">
              {currentAvatarIcon}
            </div>

            {/* Edit Avatar Overlay */}
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity border-4 border-transparent">
              <span className="text-white text-xs font-bold uppercase tracking-wider">Change</span>
            </div>

            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-violet-600 border-2 border-slate-900 text-white font-black text-sm px-4 py-1 rounded-full shadow-lg">
              LVL {user.level || 1}
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-bold uppercase tracking-widest rounded-md mb-2">
              <span>⚔️</span> {levelTitle}
            </div>

            {/* Editable Username */}
            <div className="flex items-center justify-center md:justify-start gap-3">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="bg-slate-950 border border-violet-500 rounded-lg px-3 py-1 text-2xl font-black text-white focus:outline-none w-48"
                    autoFocus
                  />
                  <button onClick={handleSaveName} className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition">
                    ✅
                  </button>
                  <button onClick={() => { setIsEditingName(false); setDraftName(user.username); }} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition">
                    ❌
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 group">
                  <h2 className="text-4xl font-black text-white">{draftName}</h2>
                  <button onClick={() => setIsEditingName(true)} className="text-slate-500 opacity-0 group-hover:opacity-100 hover:text-violet-400 transition-all">
                    ✏️
                  </button>
                </div>
              )}
            </div>

            {/* XP Progress Bar */}
            <div className="pt-4 max-w-md w-full mx-auto md:mx-0">
              <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                <span>XP Progress</span>
                <span className="text-violet-400">{user.xpProgress?.percentage || 0}%</span>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${user.xpProgress?.percentage || 0}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-linear-to-r from-violet-600 to-indigo-400 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Stats & Showcase Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left Column: Stats */}
        <div className="md:col-span-1 space-y-6">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">Lifetime Stats</h3>
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-sm">Total XP</span>
              <span className="font-bold text-violet-400">✨ {user.xp?.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-sm">Total Gold</span>
              <span className="font-bold text-yellow-400">🪙 {user.gold?.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-sm">Habits Completed</span>
              <span className="font-bold text-white">{user.stats?.totalHabitsCompleted || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-sm">Shop Purchases</span>
              <span className="font-bold text-white">{user.ownedRewards?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-sm">Achievements</span>
              <span className="font-bold text-white">{user.unlockedAchievements?.length || 0}</span>
            </div>
          </motion.section>
        </div>

        {/* Right Column: Badge Showcase */}
        <div className="md:col-span-2">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="h-full bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Premium Badge Showcase</h3>
              <span className="text-xs text-slate-500">Tap a slot to edit</span>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                {showcase.map((badgeId, idx) => (
                  <button
                    key={idx}
                    onClick={() => setEditingSlotIndex(idx)}
                    className="aspect-square rounded-2xl bg-slate-950 border-2 border-slate-800/50 flex flex-col items-center justify-center relative group transition-all hover:border-violet-500/50"
                  >
                    {badgeId ? (
                      <span className="text-5xl transform group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                        {/* ⬇️ Use Central Helper */}
                        {getItemIcon(badgeId)}
                      </span>
                    ) : (
                      <span className="text-slate-700 text-3xl font-black">+</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.section>
        </div>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>

        {/* Avatar Selection Modal */}
        {isAvatarModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Choose Avatar</h3>
                <button onClick={() => setIsAvatarModalOpen(false)} className="text-slate-400 hover:text-white">❌</button>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <button
                  onClick={() => handleSelectAvatar("default")}
                  className={`aspect-square text-4xl bg-slate-800 rounded-2xl flex items-center justify-center border-2 transition-colors ${activeAvatarId === "default" ? "border-violet-500" : "border-transparent hover:border-slate-600"}`}
                >
                  🧙‍♂️
                </button>
                {/* ⬇️ Render only cosmetics the user actually owns */}
                {userOwnedCosmetics.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectAvatar(item.id)}
                    className={`aspect-square text-4xl bg-slate-800 rounded-2xl flex items-center justify-center border-2 transition-colors ${activeAvatarId === item.id ? "border-violet-500" : "border-transparent hover:border-slate-600"}`}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Showcase Selection Modal */}
        {editingSlotIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Equip Badge</h3>
                <button onClick={() => setEditingSlotIndex(null)} className="text-slate-400 hover:text-white">❌</button>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <button
                  onClick={() => handleSelectShowcaseBadge(null)}
                  className="aspect-square text-sm font-bold text-slate-500 bg-slate-800 rounded-2xl flex items-center justify-center border-2 border-transparent hover:border-red-500/50 hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
                {/* ⬇️ Filter user owned items to only show badges! */}
                {userOwnedCosmetics.filter((i) => i.id.startsWith("badge_")).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectShowcaseBadge(item.id)}
                    disabled={showcase.includes(item.id)}
                    className={`aspect-square text-4xl bg-slate-800 rounded-2xl flex items-center justify-center border-2 transition-colors ${showcase.includes(item.id) ? "opacity-50 cursor-not-allowed border-transparent" : "border-transparent hover:border-violet-500"}`}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
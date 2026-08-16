"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const FEATURES = [
  {
    id: "xp",
    title: "Earn XP & Level Up",
    description: "Every habit completed pushes your XP bar forward. Reach new milestones to unlock exclusive shop tiers and harder challenges.",
    icon: "✨",
    hoverBorder: "hover:border-violet-500/30",
    iconBg: "bg-violet-600/20",
    iconText: "text-violet-400",
  },
  {
    id: "gold",
    title: "Spend Gold in the Shop",
    description: "Cash in your hard-earned gold for premium visual themes like Obsidian and Aurora, or buy custom cosmetic badges for your habits.",
    icon: "🪙",
    hoverBorder: "hover:border-yellow-500/30",
    iconBg: "bg-yellow-500/20",
    iconText: "text-yellow-400",
  },
  {
    id: "powerups",
    title: "Equip Powerups",
    description: "Buy a Streak Shield to protect your 30-day streak when you need a rest day, or activate an XP Surge to double your gains for 24 hours.",
    icon: "🛡️",
    hoverBorder: "hover:border-blue-500/30",
    iconBg: "bg-blue-500/20",
    iconText: "text-blue-400",
  }
];

const FAQS = [
  {
    question: "Is HabitQuest free to play?",
    answer: "Yes! The core habit tracking, leveling system, and basic rewards are 100% free. You can earn everything in the shop just by completing your habits."
  },
  {
    question: "How do streaks and powerups work?",
    answer: "If you miss a day, your streak breaks. But if you buy a Streak Shield from the shop with your gold, it automatically consumes itself to save your streak if you miss a habit!"
  },
  {
    question: "Can I use it on my phone?",
    answer: "Absolutely. HabitQuest is a Progressive Web App designed with a sleek mobile interface so you can check off your routines on the go."
  },
  {
    question: "What happens when I level up?",
    answer: "Leveling up unlocks higher tiers in the Reward Shop, giving you access to premium avatars, elite badges, and exclusive color themes."
  }
];

// ── ISOLATED COMPONENT: Only this tiny piece re-renders now! ──
const FaqAccordion = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {FAQS.map((faq, idx) => {
        const isOpen = openFaq === idx;
        return (
          <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
            <button
              onClick={() => setOpenFaq(isOpen ? null : idx)}
              className="w-full cursor-pointer text-left px-6 py-5 flex items-center justify-between font-bold text-lg hover:bg-slate-800/50 transition-colors"
            >
              {faq.question}
              <span className={`text-violet-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 text-slate-400 leading-relaxed">
                    {faq.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default function LandingPage() {
  return (
    <div className="theme-obsidian relative w-full min-h-dvh bg-slate-950 text-white overflow-hidden font-sans selection:bg-violet-500/30">

      {/* ── Background Glow Effects ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />

      {/* ── Top Navigation ── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="text-2xl font-black tracking-tight">
          Habit<span className="text-violet-500">Quest</span>
        </div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="px-5 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2 text-sm font-semibold bg-violet-600 hover:bg-violet-500 rounded-xl transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)]"
          >
            Play Now
          </Link>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-20 pb-32 text-center max-w-5xl mx-auto">
        {/* ── Floating RPG Elements (Background) ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">

          {/* Gold Coin (Top Left) */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, type: "spring", bounce: 0.5 }}
            className="absolute top-[12%] left-[4%] md:top-[10%] md:left-[20%]"
          >
            <motion.div
              animate={{ y: [-15, 15, -15], rotate: [-10, 15, -10] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="w-10 h-10 md:w-12 md:h-12 bg-yellow-500/20 border border-yellow-500/40 rounded-full flex items-center justify-center text-xl md:text-2xl shadow-[0_0_30px_rgba(234,179,8,0.2)] backdrop-blur-md"
            >
              🪙
            </motion.div>
          </motion.div>

          {/* XP Sparkle (Bottom Right) */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4, type: "spring", bounce: 0.5 }}
            className="absolute bottom-[15%] right-[4%] md:bottom-[20%] md:right-[20%]"
          >
            <motion.div
              animate={{ y: [-20, 20, -20], rotate: [10, -15, 10] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="w-12 h-12 md:w-14 md:h-14 bg-violet-600/20 border border-violet-500/40 rounded-xl flex items-center justify-center text-2xl md:text-3xl shadow-[0_0_30px_rgba(124,58,237,0.2)] backdrop-blur-md"
            >
              ✨
            </motion.div>
          </motion.div>

          {/* Premium Crown Badge (Top Right) */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3, type: "spring", bounce: 0.5 }}
            className="absolute top-[22%] right-[3%] md:top-[15%] md:right-[15%]"
          >
            <motion.div
              animate={{ y: [-10, 10, -10], scale: [1, 1.1, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="w-8 h-8 md:w-10 md:h-10 bg-rose-500/20 border border-rose-500/40 rounded-lg flex items-center justify-center text-lg md:text-xl shadow-[0_0_30px_rgba(244,63,94,0.2)] backdrop-blur-md opacity-80"
            >
              👑
            </motion.div>
          </motion.div>

          {/* Shield Powerup (Bottom Left) */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, type: "spring", bounce: 0.5 }}
            className="absolute bottom-[25%] left-[3%] md:bottom-[25%] md:left-[15%]"
          >
            <motion.div
              animate={{ y: [-15, 15, -15], rotate: [-5, 10, -5] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/20 border border-blue-500/40 rounded-full flex items-center justify-center text-base md:text-lg shadow-[0_0_30px_rgba(59,130,246,0.2)] backdrop-blur-md opacity-70"
            >
              🛡️
            </motion.div>
          </motion.div>

          {/* NEW: Dragon Badge with Golden Border (Mid Left) */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5, type: "spring", bounce: 0.5 }}
            className="absolute top-[45%] right-[10%] md:top-[50%] md:right-[5%]"
          >
            <motion.div
              animate={{ y: [-20, 20, -20], rotate: [5, -8, 5] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-10 h-10 md:w-14 md:h-14 bg-slate-900/80 border-2 border-yellow-400/80 rounded-xl flex items-center justify-center text-xl md:text-3xl shadow-[0_0_25px_rgba(250,204,21,0.4)] backdrop-blur-md"
            >
              🐉
            </motion.div>
          </motion.div>

          {/* NEW: XP Pill Icon (Mid Right) */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.6, type: "spring", bounce: 0.5 }}
            className="absolute bottom-[40%] left-[2%] md:bottom-[45%] md:left-[5%]"
          >
            <motion.div
              animate={{ y: [-15, 15, -15], scale: [1, 1.05, 1] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-indigo-500/20 border border-indigo-400/50 rounded-full flex items-center justify-center text-xs md:text-base font-black text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.3)] backdrop-blur-md tracking-widest"
            >
              XP
            </motion.div>
          </motion.div>

        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-sm font-medium text-violet-400 mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
          </span>
          Level up your real life.
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6"
        >
          Turn your routines into a <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-violet-400 to-indigo-400">
            rewarding adventure.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed"
        >
          Build good habits, earn gold, and unlock premium themes, powerups, and avatars. Quit playing games, and start playing your life.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        >
          <Link
            href="/signup"
            className="group relative inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-950 font-bold text-lg rounded-2xl hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(124,58,237,0.4)]"
          >
            Start Your Quest
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </motion.div>
      </main>

      {/* ── Features Grid ── */}
      <section className="relative z-10 px-6 pb-24 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((feature, idx) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: idx * 0.1 }}

              className={`bg-slate-900/50 border border-slate-800 p-8 rounded-3xl backdrop-blur-sm transition-colors ${feature.hoverBorder}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-6 ${feature.iconBg} ${feature.iconText}`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Player Profile Preview ── */}
      <section className="relative z-10 px-6 pb-20 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 md:p-16 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px]" />

          <div className="flex-1 space-y-6 relative z-10 text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">Your Digital Avatar.</h2>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md mx-auto md:mx-0">
              Your profile reflects your real-world discipline. Unlock the legendary Dragon avatar, equip your hard-earned badges, and show off your level.
            </p>
          </div>

          <motion.div
            animate={{ y: [-8, 8, -8] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-full max-w-sm shrink-0 bg-slate-950 border border-slate-700 rounded-3xl p-6 shadow-[0_0_50px_rgba(124,58,237,0.15)] relative z-10"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-4xl border-2 border-violet-500/50 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                  🐉
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">HabitMaster</h4>
                  <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider">Level 42 Knight</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm justify-end">🪙 12,450</div>
                <div className="flex items-center gap-1 text-violet-400 font-bold text-sm justify-end">✨ 8,120</div>
              </div>
            </div>

            <div className="space-y-1 mb-6">
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>XP Progress</span>
                <span>80%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "80%" }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                  className="h-full bg-linear-to-r from-violet-500 to-indigo-400 rounded-full"
                />
              </div>
            </div>

            <div className="pt-5 border-t border-slate-800">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">Equipped Badges</p>
              <div className="flex gap-3">
                {["👑", "🎯", "🏋️", "🧠"].map((emoji, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + (i * 0.1), type: "spring" }}
                    className="w-10 h-10 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center text-xl"
                  >
                    {emoji}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className="relative z-10 px-6 pb-10 max-w-3xl mx-auto">
        <h2 className="text-3xl font-black tracking-tight mb-8 text-center">Quest Log (FAQ)</h2>

        <FaqAccordion />

      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-slate-800 bg-slate-950 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="text-xl font-black tracking-tight text-white">
              Habit<span className="text-violet-500">Quest</span>
            </div>
            <p className="text-xs text-slate-500">© 2026 HabitQuest. All rights reserved.</p>
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-slate-400 hover:text-white transition-colors">Discord</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">Twitter</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
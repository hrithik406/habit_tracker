"use client";
import React, { useEffect, useMemo, useState, memo, ReactElement } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useApp } from "../../context/AppContext";
import BentoGrid, { BentoFull, BentoHalf, BentoQuarter } from "../../components/BentoGrid";
import HabitCard from "../../components/HabitCard";
import ContributionGraph from "../../components/ContributionGraph";
import AddHabitModal from "../../components/AddHabitModal";
import type { CompletionLogEntry, LastReward } from "@/types/types";
import { getDateIsoInTimeZone } from "../../utils/date";

const LevelUpToast = memo(function LevelUpToast({
  reward, onDismiss,
}: { reward: LastReward; onDismiss: () => void }) {
  if (!reward.leveledUp) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.75, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.75, y: 40 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      style={{ willChange: "transform, opacity" }}
      className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-linear-to-r from-violet-600 to-indigo-500 text-white px-6 py-4 rounded-2xl shadow-2xl text-center min-w-55 cursor-pointer"
      onClick={onDismiss}
    >
      <div className="text-3xl mb-1">🎉</div>
      <div className="font-bold text-lg">Level Up!</div>
      <div className="text-sm opacity-90">You reached Level {reward.newLevel}</div>
    </motion.div>
  );
});

const StatCard = memo(function StatCard({ icon, label, value, sub, color = "text-violet-400" }: {
  icon: string; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="p-4 flex flex-col gap-1">
      <span className="text-2xl">{icon}</span>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-sm font-medium text-white">{label}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
});

const XPProgressBar = memo(function XPProgressBar({ pct, level }: { pct: number; level: number }) {
  return (
    <div className="p-4">
      <div className="flex justify-between text-xs text-slate-400 mb-2">
        <span className="font-semibold text-white">Level {level} — XP Progress</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-violet-600 to-indigo-400 rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
});

export default function DashboardPage(): ReactElement {
  const { user, habits, fetchHabits, lastReward, clearReward } = useApp();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  const totalStreak    = useMemo(() => habits.reduce((s, h) => s + h.currentStreak, 0), [habits]);
  const todayIso       = useMemo(() => getDateIsoInTimeZone(user?.timezone), [user?.timezone]);
  const completedToday = useMemo(() => habits.filter((h) => h.lastCompletedDate === todayIso).length, [habits, todayIso]);
  const allLogs        = useMemo<CompletionLogEntry[]>(() => habits.flatMap((h) => h.completionLog ?? []), [habits]);
  const xpPct          = user?.xpProgress?.percentage ?? 0;
  const previewHabits  = useMemo(() => habits.slice(0, 4), [habits]);

  return (
    <>
      <AnimatePresence>
        {lastReward?.leveledUp && <LevelUpToast reward={lastReward} onDismiss={clearReward} />}
      </AnimatePresence>

      <AddHabitModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      <BentoGrid>
        <BentoQuarter>
          <StatCard icon="⚡" label="Total XP"   value={user?.xp ?? 0}   color="text-violet-400" />
        </BentoQuarter>
        <BentoQuarter>
          <StatCard icon="🪙" label="Gold"        value={user?.gold ?? 0}  color="text-yellow-400" />
        </BentoQuarter>
        <BentoQuarter>
          <StatCard icon="🎖️" label="Level"       value={user?.level ?? 1}
            sub={`${user?.xpProgress?.current ?? 0}/${user?.xpProgress?.required ?? 100} XP to next`}
            color="text-indigo-400"
          />
        </BentoQuarter>
        <BentoQuarter>
          <StatCard icon="✅" label="Done today"  value={`${completedToday}/${habits.length}`}
            sub={`${totalStreak} total streak days`} color="text-emerald-400"
          />
        </BentoQuarter>

        <BentoFull>
          <XPProgressBar pct={xpPct} level={user?.level ?? 1} />
        </BentoFull>

        <BentoHalf>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-base">Today's Habits</h2>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <span className="text-sm leading-none">+</span> Add Habit
              </button>
            </div>

            {habits.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-3 text-center">
                <span className="text-4xl">🌱</span>
                <p className="text-sm text-slate-400">No habits yet.<br />Start building your streak!</p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  + Create your first habit
                </button>
              </div>
            ) : (
              <>
                {previewHabits.map((h) => <HabitCard key={h._id} habit={h} />)}
                {habits.length > 4 && (
                  <p className="text-xs text-slate-500 text-center pt-1">
                    +{habits.length - 4} more —{" "}
                    <Link href="/habits" className="text-violet-400 hover:underline">view all</Link>
                  </p>
                )}
              </>
            )}
          </div>
        </BentoHalf>

        <BentoHalf>
          <ContributionGraph completionLog={allLogs} title="Yearly Activity" timeZone={user?.timezone} />
        </BentoHalf>
      </BentoGrid>
    </>
  );
}
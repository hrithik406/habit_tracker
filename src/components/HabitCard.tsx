"use client";
import React, { useState, useCallback, memo, useMemo, ReactElement } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useApp } from "../context/AppContext";
import type { Habit, Milestone, RewardResult } from "../types/types";
import { getDateIsoInTimeZone } from "../utils/date";

function streakColor(streak: number): string {
  if (streak >= 21) return "text-red-400";
  if (streak >= 14) return "text-orange-400";
  if (streak >= 7)  return "text-yellow-400";
  return "text-slate-400";
}

// ─────────────────────────────────────────────────────────────────
// CircularProgress — SVG ring that fills as milestones complete
// ─────────────────────────────────────────────────────────────────
interface CircularProgressProps {
  pct: number;          // 0-100
  size?: number;        // px (default 36)
  strokeWidth?: number; // px (default 3)
  color: string;        // habit accent color
  isComplete: boolean;
}

const CircularProgress = memo(function CircularProgress({
  pct, size = 36, strokeWidth = 3, color, isComplete,
}: CircularProgressProps) {
  const r          = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset     = circumference - (pct / 100) * circumference;

  // When 100 %: fill solid; below 100 %: use dash animation
  const trackColor  = "#1e293b"; // slate-800
  const ringColor   = pct === 100 ? color : color;
  const ringOpacity = pct === 0 ? 0.25 : 1;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      aria-label={`${Math.round(pct)}% milestones complete`}
      role="img"
    >
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={ringColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        opacity={ringOpacity}
        // Rotate so the ring starts at 12 o'clock
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition: "stroke-dashoffset 0.45s ease, stroke 0.3s ease, opacity 0.3s ease",
          willChange: "stroke-dashoffset",
        }}
      />
      {/* Center: percentage text or check */}
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.28}
        fill={pct === 100 ? color : "#94a3b8"}
        fontWeight="700"
      >
        {pct === 100 ? "✓" : pct > 0 ? `${Math.round(pct)}` : ""}
      </text>
    </svg>
  );
});

// ─────────────────────────────────────────────────────────────────
// MilestoneRow — single checkbox item
// ─────────────────────────────────────────────────────────────────
interface MilestoneRowProps {
  milestone: Milestone;
  habitColor: string;
  onToggle: (id: string) => void;
  disabled: boolean;
}

const MilestoneRow = memo(function MilestoneRow({ milestone, habitColor, onToggle, disabled }: MilestoneRowProps) {
  return (
    <motion.button
      layout
      onClick={() => !disabled && onToggle(milestone._id)}
      disabled={disabled}
      className="w-full flex items-center gap-2.5 py-1.5 group text-left"
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      aria-checked={milestone.isCompleted}
      role="checkbox"
    >
      {/* Custom checkbox */}
      <div
        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all duration-200 ${
          milestone.isCompleted
            ? "border-transparent"
            : "border-slate-600 group-hover:border-slate-400 bg-transparent"
        }`}
        style={milestone.isCompleted ? { backgroundColor: habitColor } : undefined}
      >
        {milestone.isCompleted && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <span className={`text-xs transition-colors duration-200 leading-tight ${
        milestone.isCompleted ? "line-through text-slate-500" : "text-slate-300 group-hover:text-white"
      }`}>
        {milestone.title}
      </span>
    </motion.button>
  );
});

// ─────────────────────────────────────────────────────────────────
// Floating reward popup
// ─────────────────────────────────────────────────────────────────
const RewardPopup = memo(function RewardPopup({ xp, gold }: { xp: number; gold: number }) {
  return (
    <motion.div
      key="reward"
      initial={{ opacity: 0, y: 8, scale: 0.85 }}
      animate={{ opacity: 1, y: -44, scale: 1 }}
      exit={{ opacity: 0, y: -72, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ willChange: "transform, opacity" }}
      className="absolute top-3 right-10 z-20 pointer-events-none flex flex-col items-end gap-0.5"
    >
      <span className="text-xs font-bold bg-violet-600/90 text-white px-2 py-0.5 rounded-full shadow-md">+{xp} XP</span>
      <span className="text-xs font-bold bg-yellow-500/90 text-slate-900 px-2 py-0.5 rounded-full shadow-md">+{gold} 🪙</span>
    </motion.div>
  );
});

const CompleteShimmer = memo(function CompleteShimmer() {
  return (
    <motion.div
      key="shimmer"
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className="absolute inset-0 rounded-2xl bg-violet-400/15 pointer-events-none"
      style={{ willChange: "opacity" }}
    />
  );
});

const StreakBadge = memo(function StreakBadge({ streak }: { streak: number }) {
  const shouldReduce = useReducedMotion();
  if (streak === 0 || streak % 7 !== 0) return null;
  return (
    <motion.span
      initial={{ scale: 0, rotate: -15 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={shouldReduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 18 }}
      className="absolute -top-2 -left-2 bg-yellow-400 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-lg"
    >
      🎯 {streak}d
    </motion.span>
  );
});

function Spinner() {
  return <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />;
}

// ─────────────────────────────────────────────────────────────────
// Delete confirm button — two-tap pattern to avoid accidents
// ─────────────────────────────────────────────────────────────────
interface DeleteButtonProps { onConfirm: () => void; deleting: boolean; }

const DeleteButton = memo(function DeleteButton({ onConfirm, deleting }: DeleteButtonProps) {
  const [armed, setArmed] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // don't bubble to the card's complete handler
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 2500); // auto-disarm after 2.5 s
    } else {
      onConfirm();
    }
  }, [armed, onConfirm]);

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.9 }}
      disabled={deleting}
      className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
        armed
          ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/50"
          : "text-slate-600 hover:text-red-400 hover:bg-slate-800"
      }`}
      aria-label={armed ? "Confirm delete" : "Delete habit"}
      title={armed ? "Tap again to confirm" : "Delete habit"}
    >
      {deleting ? (
        <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
          {armed ? (
            // X icon when armed
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          ) : (
            // Trash icon when idle
            <>
              <path d="M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M5 4l.5 9h5L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </>
          )}
        </svg>
      )}
    </motion.button>
  );
});

// ─────────────────────────────────────────────────────────────────
// HabitCard — main component
// ─────────────────────────────────────────────────────────────────
const HabitCard = memo(function HabitCard({ habit }: { habit: Habit }): ReactElement {
  const { user, completeHabit, toggleMilestone, deleteHabit } = useApp();
  const shouldReduce = useReducedMotion();

  const [completing, setCompleting]   = useState(false);
  const [toggling, setToggling]       = useState<string | null>(null); // milestoneId in flight
  const [deleting, setDeleting]       = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [reward, setReward]           = useState<RewardResult | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [expanded, setExpanded]       = useState(true); // milestones panel open by default

  const todayIso = useMemo(() => getDateIsoInTimeZone(user?.timezone), [user?.timezone]);
  const isComplete = habit.lastCompletedDate === todayIso;

  // ── Derived milestone stats ─────────────────────────────────────
  const { milestones } = habit;
  const hasMilestones  = milestones.length > 0;
  const completedCount = useMemo(() => milestones.filter((m) => m.isCompleted).length, [milestones]);
  const milestonePct   = useMemo(
    () => hasMilestones ? Math.round((completedCount / milestones.length) * 100) : 0,
    [completedCount, milestones.length, hasMilestones]
  );

  // ── Manual full-habit complete (no milestones, or override) ──────
  const handleComplete = useCallback(async (e: React.MouseEvent) => {
    // Don't trigger if clicking inside the milestone list or buttons
    if ((e.target as HTMLElement).closest("[data-milestone-zone]")) return;
    if (isComplete || completing || hasMilestones) return;
    setCompleting(true);
    setError(null);
    try {
      const data = await completeHabit(habit._id);
      setReward(data.rewards);
      setJustCompleted(true);
      setTimeout(() => setReward(null), 2200);
      setTimeout(() => setJustCompleted(false), 900);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setTimeout(() => setError(null), 3000);
    } finally {
      setCompleting(false);
    }
  }, [completeHabit, habit._id, isComplete, completing, hasMilestones]);

  // ── Milestone toggle ────────────────────────────────────────────
  const handleToggle = useCallback(async (milestoneId: string) => {
    if (toggling || isComplete) return;
    setToggling(milestoneId);
    setError(null);
    try {
      const data = await toggleMilestone(habit._id, milestoneId);
      // If all milestones triggered auto-complete, show reward
      if (data.completion) {
        setReward(data.completion.rewards);
        setJustCompleted(true);
        setTimeout(() => setReward(null), 2200);
        setTimeout(() => setJustCompleted(false), 900);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not update milestone";
      setError(msg);
      setTimeout(() => setError(null), 3000);
    } finally {
      setToggling(null);
    }
  }, [toggleMilestone, habit._id, toggling, isComplete]);

  // ── Delete ──────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try { await deleteHabit(habit._id); }
    catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
      setTimeout(() => setError(null), 3000);
      setDeleting(false);
    }
  }, [deleteHabit, habit._id]);

  return (
    <motion.div
      whileHover={!isComplete && !shouldReduce && !hasMilestones ? { scale: 1.015, y: -1 } : undefined}
      whileTap={!isComplete && !hasMilestones ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      style={{ willChange: "transform" }}
      className={`relative rounded-2xl border select-none transition-colors duration-200 ${
        isComplete
          ? "bg-slate-800/60 border-slate-700/60"
          : "bg-slate-900 border-slate-700 hover:border-violet-500/40"
      } ${!hasMilestones && !isComplete ? "cursor-pointer" : "cursor-default"}`}
      onClick={!hasMilestones ? handleComplete : undefined}
      role={!hasMilestones ? "button" : undefined}
      aria-label={!hasMilestones ? `Mark ${habit.title} complete` : undefined}
      aria-pressed={!hasMilestones ? isComplete : undefined}
    >
      <StreakBadge streak={habit.currentStreak} />

      <AnimatePresence>
        {reward && <RewardPopup xp={reward.xpAwarded} gold={reward.goldAwarded} />}
      </AnimatePresence>
      <AnimatePresence>
        {justCompleted && <CompleteShimmer />}
      </AnimatePresence>

      {/* ── Card header ─────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <motion.div
          animate={justCompleted && !shouldReduce ? { scale: [1, 1.35, 1] } : { scale: 1 }}
          transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ willChange: "transform" }}
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
            isComplete ? "bg-violet-600/30 ring-2 ring-violet-500/60" : ""
          }`}
          {...(!isComplete && { style: { backgroundColor: `${habit.color}22`, willChange: "transform" } })}
        >
          {isComplete ? "✅" : habit.icon}
        </motion.div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Circular progress — only shown when milestones exist */}
            {hasMilestones && (
              <CircularProgress
                pct={milestonePct}
                color={habit.color}
                isComplete={isComplete}
                size={32}
                strokeWidth={3}
              />
            )}

            <h3 className={`font-semibold text-sm truncate ${isComplete ? "line-through text-slate-500" : "text-white"}`}>
              {habit.title}
            </h3>

            {/* Streak multiplier badge */}
            {(() => {
              const m = Math.min(Math.floor(habit.currentStreak / 7), 5);
              return m > 0 ? (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
                  +{m * 5}% XP
                </span>
              ) : null;
            })()}
          </div>

          {habit.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{habit.description}</p>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            <span className={`flex items-center gap-1 text-xs font-bold ${streakColor(habit.currentStreak)}`}>
              🔥 {habit.currentStreak}
              <span className="text-slate-500 font-normal">streak</span>
            </span>
            <span className="text-xs text-slate-500">+{habit.baseXp}XP · +{habit.baseGold}🪙</span>
            {hasMilestones && (
              <span className="text-xs text-slate-500">
                {completedCount}/{milestones.length} steps
              </span>
            )}
          </div>
        </div>

        {/* Right actions: complete ring OR milestone toggle + delete */}
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          {/* Complete indicator (no-milestone habits) */}
          {!hasMilestones && (
            completing ? <Spinner /> : (
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-150 ${
                isComplete ? "border-violet-500 bg-violet-500" : "border-slate-600 hover:border-violet-400"
              }`}>
                {isComplete && (
                  <motion.span
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="text-[10px] text-white font-bold"
                  >✓</motion.span>
                )}
              </div>
            )
          )}

          {/* Milestone expand/collapse toggle */}
          {hasMilestones && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label={expanded ? "Collapse milestones" : "Expand milestones"}
            >
              <motion.svg
                animate={{ rotate: expanded ? 0 : -90 }}
                transition={{ duration: 0.18 }}
                className="w-3.5 h-3.5"
                viewBox="0 0 16 16" fill="none"
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            </button>
          )}

          {/* Delete */}
          <DeleteButton onConfirm={handleDelete} deleting={deleting} />
        </div>
      </div>

      {/* ── Milestones panel ──────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {hasMilestones && expanded && (
          <motion.div
            key="milestones"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
            data-milestone-zone
          >
            <div className="px-4 pb-3 pt-0 border-t border-slate-800/60 mt-0">
              {/* Progress label */}
              <div className="flex items-center justify-between mb-2 pt-2.5">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Milestones
                </span>
                <span className="text-[10px] font-bold" style={{ color: milestonePct === 100 ? habit.color : "#64748b" }}>
                  {completedCount} / {milestones.length}
                  {milestonePct === 100 && " ✓"}
                </span>
              </div>

              {/* Thin progress bar */}
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{
                    width:           `${milestonePct}%`,
                    backgroundColor: milestonePct === 100 ? habit.color : `${habit.color}aa`,
                  }}
                />
              </div>

              {/* Milestone rows */}
              <div className="space-y-0.5">
                {milestones.map((m) => (
                  <MilestoneRow
                    key={m._id}
                    milestone={m}
                    habitColor={habit.color}
                    onToggle={handleToggle}
                    disabled={!!toggling || isComplete}
                  />
                ))}
              </div>

              {/* Toggling spinner */}
              {toggling && (
                <div className="flex justify-center mt-2">
                  <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="text-xs text-red-400 text-center px-4 pb-3"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default HabitCard;
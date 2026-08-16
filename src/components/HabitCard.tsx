"use client";
import React, { useState, useCallback, memo, useMemo, ReactElement } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useApp } from "../context/AppContext";
import type { Habit, Milestone, RewardResult } from "../types/types";
import { getDateIsoInTimeZone } from "../utils/date";

function streakColor(streak: number): string {
  if (streak >= 21) return "text-red-400";
  if (streak >= 14) return "text-orange-400";
  if (streak >= 7) return "text-yellow-400";
  return "text-slate-400";
}

// ─────────────────────────────────────────────────────────────────
// CircularProgress — SVG ring that fills as milestones complete
// ─────────────────────────────────────────────────────────────────
interface CircularProgressProps {
  pct: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  isComplete: boolean;
  showText?: boolean;
}

const CircularProgress = memo(function CircularProgress({
  pct, size = 36, strokeWidth = 3, color, isComplete, showText = true
}: CircularProgressProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  const trackColor = "#1e293b"; // slate-800
  const ringColor = pct === 100 ? color : color;
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
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={ringColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        opacity={ringOpacity}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition: "stroke-dashoffset 0.45s ease, stroke 0.3s ease, opacity 0.3s ease",
          willChange: "stroke-dashoffset",
        }}
      />
      {showText && (
        <text
          x={size / 2} y={size / 2}
          textAnchor="middle" dominantBaseline="central"
          fontSize={size * 0.28}
          fill={pct === 100 ? color : "#94a3b8"}
          fontWeight="700"
        >
          {pct === 100 ? "✓" : pct > 0 ? `${Math.round(pct)}` : ""}
        </text>
      )}
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
      onClick={(e) => {
        // 🔴 THE FIX: Forcefully stop browser quirks and trigger the toggle
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onToggle(milestone._id);
      }}
      className="w-full flex items-center gap-2.5 py-1.5 group text-left"
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      aria-checked={milestone.isCompleted}
      role="checkbox"
    >
      <div
        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all duration-200 ${milestone.isCompleted
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
      <span className={`text-xs transition-colors duration-200 leading-tight ${milestone.isCompleted ? "line-through text-slate-500" : "text-slate-300 group-hover:text-white"
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
// Delete confirm button
// ─────────────────────────────────────────────────────────────────
interface DeleteButtonProps { onConfirm: () => void; deleting: boolean; }

const DeleteButton = memo(function DeleteButton({ onConfirm, deleting }: DeleteButtonProps) {
  const [armed, setArmed] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 2500);
    } else {
      onConfirm();
    }
  }, [armed, onConfirm]);

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.9 }}
      disabled={deleting}
      className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${armed
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
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          ) : (
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
  const { user, completeHabit, undoHabit, toggleMilestone, deleteHabit } = useApp();
  const shouldReduce = useReducedMotion();

  const [completing, setCompleting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reward, setReward] = useState<RewardResult | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const todayIso = useMemo(() => getDateIsoInTimeZone(user?.timezone), [user?.timezone]);
  const isComplete = habit.lastCompletedDate === todayIso;

  const { milestones } = habit;
  const hasMilestones = milestones.length > 0;
  const completedCount = useMemo(() => milestones.filter((m) => m.isCompleted).length, [milestones]);
  const milestonePct = useMemo(
    () => hasMilestones ? Math.round((completedCount / milestones.length) * 100) : 0,
    [completedCount, milestones.length, hasMilestones]
  );

  const handleComplete = useCallback(async (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-milestone-zone]")) return;
    
    // THE FIX: Block manual completion for incomplete milestone habits, 
    // but ALLOW manual undoing for ALL completed habits!
    if (completing || (!isComplete && hasMilestones)) return;
    
    setCompleting(true);
    setError(null);
    
    try {
      if (isComplete) {
        await undoHabit(habit._id);
      } else {
        const data = await completeHabit(habit._id);
        setReward(data.rewards);
        setJustCompleted(true);
        setTimeout(() => setReward(null), 2200);
        setTimeout(() => setJustCompleted(false), 900);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setTimeout(() => setError(null), 3000);
    } finally {
      setCompleting(false);
    }
  }, [completeHabit, undoHabit, habit._id, isComplete, completing, hasMilestones]);

  const handleToggle = useCallback(async (milestoneId: string) => {
    if (toggling || isComplete) return;
    setToggling(milestoneId);
    setError(null);
    try {
      const data = await toggleMilestone(habit._id, milestoneId);
      if (data && data.completion) {
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
      className={`relative rounded-2xl border select-none transition-colors duration-200 ${isComplete
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
      <div className="flex items-start gap-3 py-4 px-2">

        {/* Icon + Progress Ring Wrapper */}
        <div className="relative flex items-center justify-center shrink-0 w-12 h-12">
          {hasMilestones && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <CircularProgress
                pct={milestonePct}
                color={habit.color}
                isComplete={isComplete}
                size={45}
                strokeWidth={2.5}
                showText={false}
              />
            </div>
          )}

          {/* The Existing Icon (Sits inside the ring) */}
          <motion.div
            animate={justCompleted && !shouldReduce ? { scale: [1, 1.35, 1] } : { scale: 1 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            // Safely combine the animation style and dynamic background color here:
            style={{
              willChange: "transform",
              backgroundColor: !isComplete ? `${habit.color}25` : `${habit.color}40`
            }}
            className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-xl`}
          >
            {isComplete ? "✅" : habit.icon}
          </motion.div>
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-semibold text-sm truncate ${isComplete ? "line-through text-slate-500" : "text-white"}`}>
              {habit.title}
            </h3>

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
            <span className={`flex items-center gap-1 w-fit text-xs font-bold ${streakColor(habit.currentStreak)}`}>
              🔥 {habit.currentStreak}
              <span className="text-slate-500 max-lg:hidden font-normal">streak</span>
            </span>
            <span className="text-xs text-center text-slate-500">+{habit.baseXp}XP · +{habit.baseGold}🪙</span>
            {hasMilestones && (
              <span className="text-xs text-center text-slate-500">
                {completedCount}/{milestones.length} steps
              </span>
            )}
          </div>
        </div>

        {/* Right actions: complete ring OR milestone toggle + delete */}
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          
          {/* 1. COMPLETION & UNDO */}
          {completing ? <Spinner /> : isComplete ? (
            // UNDO BUTTON (Shows for ALL completed habits)
            <button
              onClick={(e) => {
                e.stopPropagation(); // 🔴 CRITICAL FIX: Stops the click from bubbling up to the card!
                handleComplete(e);
              }}
              className="group flex items-center justify-center w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
              title="Undo completion"
              aria-label="Undo completion"
            >
              <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
          ) : !hasMilestones ? (
            // EMPTY CIRCLE (Only for simple, incomplete habits)
            <div className="w-5 h-5 rounded-full border-2 border-slate-600 hover:border-violet-400 flex items-center justify-center transition-colors duration-150" />
          ) : null}

          {/* 2. MILESTONE CHEVRON (Only for habits with milestones) */}
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

          {/* 3. DELETE BUTTON */}
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
              <div className="flex items-center justify-between mb-2 pt-2.5">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Milestones
                </span>
                <span className="text-[10px] font-bold" style={{ color: milestonePct === 100 ? habit.color : "#64748b" }}>
                  {completedCount} / {milestones.length}
                  {milestonePct === 100 && " ✓"}
                </span>
              </div>

              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{
                    width: `${milestonePct}%`,
                    backgroundColor: milestonePct === 100 ? habit.color : `${habit.color}aa`,
                  }}
                />
              </div>

              <div className="space-y-0.5">
                {milestones.map((m) => (
                  <MilestoneRow
                    key={m._id}
                    milestone={m}
                    habitColor={habit.color}
                    onToggle={handleToggle}
                    disabled={isComplete}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
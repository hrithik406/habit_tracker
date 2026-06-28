"use client";
import React, { useState, useCallback, useEffect, useMemo, memo, ReactElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import type { CreateHabitForm, HabitFrequency } from "../types/types";
import { getDateIsoInTimeZone } from "../utils/date";

// ── Constants ─────────────────────────────────────────────────────
const EMOJI_OPTIONS = ["⚡", "🔥", "💪", "🧘", "📚", "🏃", "🥗", "💧", "🎯", "🎸", "✍️", "🧠", "🌿", "😴", "🚴", "🏋️", "🧹", "💻", "🎨", "🫀"];
const COLOR_OPTIONS = ["#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#14b8a6"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_FORM: CreateHabitForm = {
  title: "",
  description: "",
  icon: "⚡",
  color: "#6366f1",
  frequency: "daily",
  customDays: [true, true, true, true, true, true, true],
  baseXp: 20,
  baseGold: 5,
  timeLimit: {},
  milestones: [],
};

// ── Small sub-components ──────────────────────────────────────────
const SectionLabel = memo(({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{children}</p>
));
SectionLabel.displayName = "SectionLabel";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}
const LabeledInput = memo(({ label, ...props }: InputProps) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs text-slate-400">{label}</span>
    <input
      {...props}
      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
    />
  </label>
));
LabeledInput.displayName = "LabeledInput";

// Inline input to add a single milestone title
const MilestoneInput = memo(function MilestoneInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [val, setVal] = useState("");
  const submit = () => {
    const t = val.trim();
    if (!t) return;
    onAdd(t);
    setVal("");
  };
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        placeholder="Add a step… (Enter to add)"
        maxLength={120}
        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!val.trim()}
        className="px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        Add
      </button>
    </div>
  );
});

// ── Main modal ────────────────────────────────────────────────────
interface AddHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddHabitModal({ isOpen, onClose }: AddHabitModalProps): ReactElement {
  const { createHabit } = useApp();
  const [form, setForm] = useState<CreateHabitForm>(DEFAULT_FORM);
  const browserTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const todayIso = useMemo(() => getDateIsoInTimeZone(browserTimeZone), [browserTimeZone]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form every time modal opens
  useEffect(() => {
    if (isOpen) { setForm(DEFAULT_FORM); setError(null); }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const set = useCallback(<K extends keyof CreateHabitForm>(key: K, value: CreateHabitForm[K]) => {
    setForm((f:any) => ({ ...f, [key]: value }));
  }, []);

  const setTimeLimit = useCallback(<K extends keyof CreateHabitForm["timeLimit"]>(
    key: K, value: CreateHabitForm["timeLimit"][K]
  ) => {
    setForm((f:any) => ({ ...f, timeLimit: { ...f.timeLimit, [key]: value } }));
  }, []);

  const toggleCustomDay = useCallback((i: number) => {
    setForm((f: any) => {
      const days = [...f.customDays];
      days[i] = !days[i];
      return { ...f, customDays: days };
    });
  }, []);

  const handleFrequencyChange = useCallback((freq: HabitFrequency) => {
    set("frequency", freq);
    if (freq === "weekdays") set("customDays", [false, true, true, true, true, true, false]);
    else if (freq === "weekends") set("customDays", [true, false, false, false, false, false, true]);
    else set("customDays", [true, true, true, true, true, true, true]);
  }, [set]);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) { setError("Habit title is required."); return; }
    if (form.frequency === "custom" && !form.customDays.some(Boolean)) {
      setError("Pick at least one day."); return;
    }
    setSaving(true);
    setError(null);
    try {
      await createHabit(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create habit");
    } finally {
      setSaving(false);
    }
  }, [form, createHabit, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal panel */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 48, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            style={{ willChange: "transform, opacity" }}
            className="fixed inset-x-4 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
                       z-50 w-full sm:max-w-lg bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl
                       shadow-2xl max-h-[92dvh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{form.icon}</span>
                <h2 className="text-base font-bold text-white">New Habit</h2>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-lg leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

              {/* Title + description */}
              <div className="space-y-3">
                <LabeledInput
                  label="Title *"
                  placeholder="e.g. Morning Run"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  maxLength={100}
                  autoFocus
                />
                <LabeledInput
                  label="Description"
                  placeholder="Optional details…"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  maxLength={300}
                />
              </div>

              {/* Icon picker */}
              <div>
                <SectionLabel>Icon</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => set("icon", emoji)}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all
                        ${form.icon === emoji ? "ring-2 ring-violet-500 bg-violet-600/20 scale-110" : "bg-slate-800 hover:bg-slate-700"}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <SectionLabel>Color</SectionLabel>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((hex) => (
                    <button
                      key={hex}
                      onClick={() => set("color", hex)}
                      className={`w-7 h-7 rounded-full transition-transform ${form.color === hex ? "scale-125 ring-2 ring-white/60" : "hover:scale-110"}`}
                      style={{ backgroundColor: hex }}
                      aria-label={hex}
                    />
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div>
                <SectionLabel>Frequency</SectionLabel>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["daily", "weekdays", "weekends", "custom"] as HabitFrequency[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => handleFrequencyChange(f)}
                      className={`py-2 rounded-lg text-xs font-semibold capitalize transition-colors
                        ${form.frequency === f ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Custom day toggles */}
                {form.frequency === "custom" && (
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {DAY_LABELS.map((d, i) => (
                      <button
                        key={d}
                        onClick={() => toggleCustomDay(i)}
                        className={`flex-1 min-w-9 py-1.5 rounded-lg text-xs font-bold transition-colors
                          ${form.customDays[i] ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-500"}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Time limits */}
              <div>
                <SectionLabel>Time & Deadline (optional)</SectionLabel>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <LabeledInput
                    label="Due by (time)"
                    type="time"
                    value={form.timeLimit.dueTime ?? ""}
                    onChange={(e) => setTimeLimit("dueTime", e.target.value || undefined)}
                  />
                  <LabeledInput
                    label="Deadline date"
                    type="date"
                    value={form.timeLimit.deadlineDate ?? ""}
                    min={todayIso}
                    onChange={(e) => setTimeLimit("deadlineDate", e.target.value || undefined)}
                  />
                  <LabeledInput
                    label="Est. minutes"
                    type="number"
                    min={1}
                    max={480}
                    placeholder="e.g. 30"
                    value={form.timeLimit.estimatedMinutes ?? ""}
                    onChange={(e) => setTimeLimit("estimatedMinutes", e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </div>

              {/* XP / Gold rewards */}
              <div>
                <SectionLabel>Rewards per completion</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-400">Base XP ✨</span>
                    <input
                      type="range" min={5} max={100} step={5}
                      value={form.baseXp}
                      onChange={(e) => set("baseXp", Number(e.target.value))}
                      className="accent-violet-500"
                    />
                    <span className="text-xs text-violet-400 font-bold">{form.baseXp} XP</span>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-400">Base Gold 🪙</span>
                    <input
                      type="range" min={1} max={50} step={1}
                      value={form.baseGold}
                      onChange={(e) => set("baseGold", Number(e.target.value))}
                      className="accent-yellow-400"
                    />
                    <span className="text-xs text-yellow-400 font-bold">{form.baseGold} Gold</span>
                  </label>
                </div>
              </div>


              {/* Milestones */}
              <div>
                <SectionLabel>Milestones (optional)</SectionLabel>
                <p className="text-xs text-slate-500 mb-2">
                  The habit auto-completes and awards XP once all steps are checked off.
                </p>
                <div className="space-y-1.5 mb-2">
                  {form.milestones.map((m: any, i: any) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                      <div className="w-3 h-3 rounded-sm border border-slate-600 shrink-0" />
                      <span className="flex-1 text-xs text-slate-300 truncate">{m.title}</span>
                      <button
                        type="button"
                        onClick={() => set("milestones", form.milestones.filter((_: any, j: any) => j !== i))}
                        className="text-slate-600 hover:text-red-400 transition-colors text-sm leading-none px-1"
                        aria-label="Remove milestone"
                      >✕</button>
                    </div>
                  ))}
                </div>
                {form.milestones.length < 10 ? (
                  <MilestoneInput onAdd={(title) => set("milestones", [...form.milestones, { title }])} />
                ) : (
                  <p className="text-xs text-slate-500">Maximum 10 milestones reached.</p>
                )}
              </div>

              {/* Preview */}
              <div>
                <SectionLabel>Preview</SectionLabel>
                <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: `${form.color}22`, border: `1.5px solid ${form.color}55` }}
                  >
                    {form.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{form.title || "Habit title"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {form.frequency === "custom"
                        ? DAY_LABELS.filter((_, i) => form.customDays[i]).join(", ") || "No days"
                        : form.frequency}
                      {form.timeLimit.dueTime && ` · by ${form.timeLimit.dueTime}`}
                      {form.timeLimit.estimatedMinutes && ` · ~${form.timeLimit.estimatedMinutes}min`}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">+{form.baseXp}XP · +{form.baseGold}🪙 per completion</p>
                  </div>
                </div>
              </div>

              {error && <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-slate-800 shrink-0">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !form.title.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
                ) : "Create Habit ✓"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
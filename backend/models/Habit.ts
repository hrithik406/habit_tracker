import mongoose, { Document, Schema, Model } from "mongoose";

// ── Sub-document interfaces ───────────────────────────────────────

export interface ICompletionLog {
  date: string; // "YYYY-MM-DD"
  xpAwarded: number;
  goldAwarded: number;
  streakAtCompletion: number;
}

/**
 * IMilestone — a single step within a habit.
 * When ALL milestones are isCompleted = true, the habit is
 * automatically marked complete and XP/Gold are awarded.
 */
export interface IMilestone {
  _id: mongoose.Types.ObjectId;
  title: string;
  isCompleted: boolean;
}

export type HabitFrequency = "daily" | "weekdays" | "weekends" | "custom";

// ── Document interface ────────────────────────────────────────────
export interface IHabit extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  customDays: boolean[];
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string;
  baseXp: number;
  baseGold: number;
  completionLog: ICompletionLog[];
  milestones: IMilestone[];          // ← NEW — array of sub-steps
  isArchived: boolean;
  // virtuals
  streakMultiplier: number;
  todayComplete: boolean;
  milestoneProgress: number;         // ← virtual: 0-100 %
}

export type IHabitModel = Model<IHabit>;

// ── Completion log sub-schema ─────────────────────────────────────
const completionLogSchema = new Schema<ICompletionLog>(
  {
    date:               { type: String, required: true },
    xpAwarded:          { type: Number, default: 0 },
    goldAwarded:        { type: Number, default: 0 },
    streakAtCompletion: { type: Number, default: 1 },
  },
  { _id: false }
);

// ── Milestone sub-schema ──────────────────────────────────────────
// _id is kept (default true) so we can target individual milestones
// via PUT /habits/:id/milestone/:milestoneId
const milestoneSchema = new Schema<IMilestone>({
  title:       { type: String, required: true, trim: true, maxlength: 120 },
  isCompleted: { type: Boolean, default: false },
});

// ── Habit schema ──────────────────────────────────────────────────
const habitSchema = new Schema<IHabit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Habit title is required"],
      trim: true,
      maxlength: 100,
    },
    description: { type: String, trim: true, maxlength: 300 },
    icon:        { type: String, default: "⚡" },
    color:       { type: String, default: "#6366f1" },
    frequency: {
      type: String,
      enum: ["daily", "weekdays", "weekends", "custom"] as HabitFrequency[],
      default: "daily",
    },
    customDays:         { type: [Boolean], default: [true,true,true,true,true,true,true] },
    currentStreak:      { type: Number, default: 0, min: 0 },
    longestStreak:      { type: Number, default: 0, min: 0 },
    lastCompletedDate:  { type: String, default: "" },
    baseXp:             { type: Number, default: 20, min: 1 },
    baseGold:           { type: Number, default: 5,  min: 0 },
    completionLog:      [completionLogSchema],
    milestones:         [milestoneSchema],   // ← NEW — defaults to []
    isArchived:         { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Virtuals ──────────────────────────────────────────────────────

/** +5 % per 7-day streak milestone, capped at +25 % */
habitSchema.virtual("streakMultiplier").get(function (this: IHabit): number {
  const m = Math.min(Math.floor(this.currentStreak / 7), 5);
  return 1 + m * 0.05;
});

habitSchema.virtual("todayComplete").get(function (this: IHabit): boolean {
  return this.lastCompletedDate === new Date().toISOString().split("T")[0];
});

/** 0–100 percentage of milestones completed (0 when no milestones) */
habitSchema.virtual("milestoneProgress").get(function (this: IHabit): number {
  if (!this.milestones.length) return 0;
  const done = this.milestones.filter((m) => m.isCompleted).length;
  return Math.round((done / this.milestones.length) * 100);
});

habitSchema.set("toJSON",   { virtuals: true });
habitSchema.set("toObject", { virtuals: true });

const Habit: IHabitModel = mongoose.model<IHabit, IHabitModel>("Habit", habitSchema);
export default Habit;
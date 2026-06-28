import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import Habit, { IHabit } from "../models/Habit";
import User from "../models/User";
import { getDateIsoInTimeZone } from "../utils/date";
import { ensureUser } from "../utils/ensureUser";

const router = Router();

// ── Shared types ──────────────────────────────────────────────────
interface CompleteHabitBody  { userId: string; clientDate: string; }
interface CreateHabitBody {
  userId: string; title: string; description?: string;
  icon?: string; color?: string; frequency?: IHabit["frequency"];
  customDays?: boolean[]; baseXp?: number; baseGold?: number;
  milestones?: Array<{ title: string }>;
}
interface ComputedRewards { xpAwarded: number; goldAwarded: number; multiplier: number; }

// ── Pure helpers ──────────────────────────────────────────────────
function getYesterday(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

function isValidClientDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const provided = new Date(`${dateStr}T00:00:00Z`);
  const today    = new Date(); today.setUTCHours(0,0,0,0);
  return provided <= today;
}

/**
 * XP / Gold formula:
 *   reward = base × multiplier
 *   multiplier = 1 + min(floor(streak/7), 5) × 0.05   → max ×1.25
 */
function computeRewards(baseXp: number, baseGold: number, streak: number): ComputedRewards {
  const milestones = Math.min(Math.floor(streak / 7), 5);
  const multiplier = 1 + milestones * 0.05;
  return {
    xpAwarded:  Math.round(baseXp   * multiplier),
    goldAwarded: Math.round(baseGold * multiplier),
    multiplier,
  };
}

/**
 * Shared streak-validation + XP-award logic.
 * Called by BOTH the manual-complete route AND the milestone
 * auto-complete trigger so the math is never duplicated.
 */
async function runHabitComplete(
  habit: IHabit,
  currentDate: string,
  userId: string
): Promise<{
  updatedHabit: IHabit;
  streakResult: object;
  rewards: object;
  levelResult: object;
  user: object;
}> {
  const { lastCompletedDate } = habit;

  if (lastCompletedDate === currentDate) throw new Error("ALREADY_COMPLETED");

  let newStreak: number;
  if      (lastCompletedDate === "")                      newStreak = 1;
  else if (lastCompletedDate === getYesterday(currentDate)) newStreak = habit.currentStreak + 1;
  else                                                     newStreak = 1;

  const { xpAwarded, goldAwarded, multiplier } = computeRewards(habit.baseXp, habit.baseGold, newStreak);

  habit.currentStreak    = newStreak;
  habit.longestStreak    = Math.max(habit.longestStreak, newStreak);
  habit.lastCompletedDate = currentDate;
  habit.completionLog.push({ date: currentDate, xpAwarded, goldAwarded, streakAtCompletion: newStreak });
  await habit.save();

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  const levelResult = user.awardCurrency(xpAwarded, goldAwarded);
  await user.save();

  return {
    updatedHabit: habit,
    streakResult: {
      previousStreak:   newStreak === 1 ? 0 : newStreak - 1,
      newStreak,
      milestoneReached: newStreak % 7 === 0,
      multiplier,
    },
    rewards:     { xpAwarded, goldAwarded },
    levelResult,
    user: {
      xp: user.xp, gold: user.gold, level: user.level, xpProgress: user.xpProgress,
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// GET /api/habits
// ─────────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query as { userId?: string };
    if (!userId) { res.status(400).json({ error: "userId is required" }); return; }
    const habits = await Habit.find({ userId, isArchived: false }).sort({ createdAt: 1 });
    res.json({ habits });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: (err as Error).message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/habits
// ─────────────────────────────────────────────────────────────────
router.post("/", async (req: Request<{}, {}, CreateHabitBody>, res: Response): Promise<void> => {
  try {
    const { userId, title, description, icon, color, frequency, customDays, baseXp, baseGold, milestones } = req.body;
    if (!userId || !title) { res.status(400).json({ error: "userId and title are required" }); return; }

    const habit = await Habit.create({
      userId, title, description, icon, color, frequency, customDays, baseXp, baseGold,
      // milestones array — each gets an auto _id from Mongoose
      milestones: (milestones ?? []).map((m) => ({ title: m.title, isCompleted: false })),
    });
    res.status(201).json({ habit });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: (err as Error).message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/habits/:id/complete   (manual full-habit completion)
// ─────────────────────────────────────────────────────────────────
router.post(
  "/:id/complete",
  async (req: Request<{ id: string }, {}, CompleteHabitBody>, res: Response): Promise<void> => {
    try {
      const { userId } = req.body;
      if (!userId) { res.status(400).json({ error: "userId is required" }); return; }

      const user = await ensureUser(userId);

      const currentDate = getDateIsoInTimeZone(user.timezone);

      const habit = await Habit.findOne({ _id: req.params.id, userId });
      if (!habit) { res.status(404).json({ error: "Habit not found" }); return; }
      if (habit.isArchived) { res.status(400).json({ error: "Cannot complete an archived habit" }); return; }

      try {
        const result = await runHabitComplete(habit, currentDate, userId);
        res.json({ message: "Habit completed", ...result, habit: result.updatedHabit });
      } catch (e) {
        if ((e as Error).message === "ALREADY_COMPLETED") {
          res.status(409).json({ error: "Habit already logged for today" });
        } else throw e;
      }
    } catch (err) {
      res.status(500).json({ error: "Server error", details: (err as Error).message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// PUT /api/habits/:id/milestone/:milestoneId
//
// Toggles isCompleted on the target milestone.
// If ALL milestones are now true AND the habit hasn't been completed
// today, automatically runs the "Habit Completed" logic.
// ─────────────────────────────────────────────────────────────────
router.put(
  "/:id/milestone/:milestoneId",
  async (
    req: Request<{ id: string; milestoneId: string }, {}, { userId: string }>,
    res: Response
  ): Promise<void> => {
    try {
      const { userId } = req.body;
      if (!userId) { res.status(400).json({ error: "userId is required" }); return; }

      // Validate milestoneId is a valid ObjectId before querying
      if (!mongoose.isValidObjectId(req.params.milestoneId)) {
        res.status(400).json({ error: "Invalid milestoneId" }); return;
      }

      const habit = await Habit.findOne({ _id: req.params.id, userId });
      if (!habit) { res.status(404).json({ error: "Habit not found" }); return; }
      if (habit.isArchived) { res.status(400).json({ error: "Cannot modify an archived habit" }); return; }

      // ── Locate the milestone ───────────────────────────────────
      const milestone = habit.milestones.find((m) => m._id.toString() === req.params.milestoneId);
      if (!milestone) { res.status(404).json({ error: "Milestone not found" }); return; }

      // ── Toggle ─────────────────────────────────────────────────
      milestone.isCompleted = !milestone.isCompleted;

      // ── Check if all milestones are now complete ───────────────
      const allDone = habit.milestones.length > 0
        && habit.milestones.every((m) => m.isCompleted);

      const user = await ensureUser(userId);

      const currentDate = getDateIsoInTimeZone(user.timezone);
      const alreadyCompletedToday = habit.lastCompletedDate === currentDate;

      if (allDone && !alreadyCompletedToday) {
        // ── Auto-trigger habit completion ──────────────────────
        await habit.save(); // save milestone toggle first
        const result = await runHabitComplete(habit, currentDate, userId);

        res.json({
          message:    "All milestones completed — habit auto-completed!",
          habit:      result.updatedHabit,
          completion: {
            streakResult: result.streakResult,
            rewards:      result.rewards,
            levelResult:  result.levelResult,
            user:         result.user,
          },
        });
      } else {
        // ── Just save the toggle ───────────────────────────────
        await habit.save();
        res.json({
          message: `Milestone ${milestone.isCompleted ? "completed" : "unchecked"}`,
          habit,
        });
      }
    } catch (err) {
      res.status(500).json({ error: "Server error", details: (err as Error).message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// PATCH /api/habits/:id
// ─────────────────────────────────────────────────────────────────
router.patch(
  "/:id",
  async (req: Request<{ id: string }, {}, Partial<CreateHabitBody>>, res: Response): Promise<void> => {
    try {
      const { userId, title, description, icon, color, frequency, customDays, baseXp, baseGold, milestones } = req.body;
      const update: Record<string, unknown> = { title, description, icon, color, frequency, customDays, baseXp, baseGold };
      if (milestones !== undefined) {
        update.milestones = milestones.map((m) => ({ title: m.title, isCompleted: false }));
      }
      const habit = await Habit.findOneAndUpdate({ _id: req.params.id, userId }, update, { new: true, runValidators: true });
      if (!habit) { res.status(404).json({ error: "Habit not found" }); return; }
      res.json({ habit });
    } catch (err) {
      res.status(500).json({ error: "Server error", details: (err as Error).message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// DELETE /api/habits/:id   (soft archive)
// ─────────────────────────────────────────────────────────────────
router.delete("/:id", async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { userId } = req.query as { userId?: string };
    const habit = await Habit.findOneAndUpdate({ _id: req.params.id, userId }, { isArchived: true }, { new: true });
    if (!habit) { res.status(404).json({ error: "Habit not found" }); return; }
    res.json({ message: "Habit archived", habit });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: (err as Error).message });
  }
});

export default router;
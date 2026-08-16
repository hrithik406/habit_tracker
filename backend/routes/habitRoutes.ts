import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import Habit, { IHabit } from "../models/Habit";
import User from "../models/User";
import { getDateIsoInTimeZone } from "../utils/date";
import { ensureUser } from "../utils/ensureUser";
import { evaluateAchievements } from "../utils/achievementsEngine";

const router = Router();

// ── Shared types ──────────────────────────────────────────────────
interface CompleteHabitBody { userId: string; clientDate: string; }
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

/**
 * XP / Gold formula:
 *   reward = base × multiplier
 *   multiplier = 1 + min(floor(streak/7), 5) × 0.05   → max ×1.25
 */
function computeRewards(baseXp: number, baseGold: number, streak: number): ComputedRewards {
  const milestones = Math.min(Math.floor(streak / 7), 5);
  const multiplier = 1 + milestones * 0.05;
  return {
    xpAwarded: Math.round(baseXp * multiplier),
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
  newlyUnlocked: object;
  streakResult: object;
  rewards: object;
  levelResult: object;
  user: object;
}> {
  const { lastCompletedDate } = habit;

  if (lastCompletedDate === currentDate) throw new Error("ALREADY_COMPLETED");

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // 1. Clean up any expired powerups before checking them
  const now = new Date();
  user.activePowerups = user.activePowerups.filter((p: any) => new Date(p.expiresAt) > now);

  let newlyUnlockedIds: string[] = [];

  // 2. Check for Streak Shield!
  let newStreak: number;
  const missedYesterday = lastCompletedDate !== "" && lastCompletedDate !== getYesterday(currentDate);
  const hasShield = user.activePowerups.some((p: any) => p.itemId === "streak_shield");

  if (lastCompletedDate === "") {
    newStreak = 1; // Brand new habit
  } else if (lastCompletedDate === getYesterday(currentDate)) {
    newStreak = habit.currentStreak + 1; // Perfect streak
  } else if (missedYesterday && hasShield) {
    // 🛡️ SHIELD ACTIVATED! Save the streak and consume the shield!
    newStreak = habit.currentStreak + 1;
    user.activePowerups = user.activePowerups.filter((p: any) => p.itemId !== "streak_shield");

    // ⬇️ ADD THIS NEW BLOCK: Give them the Close Call achievement! ⬇️
    const hasEcoShield = user.unlockedAchievements.some((a: any) => a.achievementId === "eco_shield");
    if (!hasEcoShield) {
      user.unlockedAchievements.push({
        achievementId: "eco_shield",
        unlockedAt: new Date(),
        isClaimed: false
      } as any);
      newlyUnlockedIds.push("eco_shield"); // ⬅️ Ensures the frontend sees it!
    }
    // ⬆️ END OF NEW BLOCK ⬆️

  } else {
    newStreak = 1; // Streak broken :(
  }

  // 3. Calculate Base Rewards
  const { xpAwarded: baseXpAwarded, goldAwarded, multiplier } = computeRewards(habit.baseXp, habit.baseGold, newStreak);

  // 4. Check for XP Surge!
  let finalXpAwarded = baseXpAwarded;
  const hasXpBoost = user.activePowerups.some((p: any) => p.itemId === "xp_boost");
  if (hasXpBoost) {
    finalXpAwarded = Math.round(baseXpAwarded * 2); // ⚡️ DOUBLE THE XP!
  }

  // 5. Save Habit Data
  habit.currentStreak = newStreak;
  habit.longestStreak = Math.max(habit.longestStreak, newStreak);
  habit.lastCompletedDate = currentDate;
  habit.completionLog.push({ date: currentDate, xpAwarded: finalXpAwarded, goldAwarded, streakAtCompletion: newStreak });
  await habit.save();

  // 6. Update Lifetime Stats & Currency
  if (!user.stats) {
    user.stats = { totalHabitsCompleted: 0, totalAchievements: 0, totalGoldSpent: 0, highestStreak: 0 };
  }

  // Increment total habits
  user.stats.totalHabitsCompleted += 1;

  // It checks if the streak they just got is higher than their all-time highest record!
  user.stats.highestStreak = Math.max(user.stats.highestStreak || 0, newStreak);

  // ── NEW: RUN THE ACHIEVEMENT ENGINE ──
  const { newlyUnlocked } = evaluateAchievements(user, newStreak);

  // Merge the dynamically unlocked ones with the Shield achievement (if triggered)
  newlyUnlockedIds = [...newlyUnlockedIds, ...newlyUnlocked];

  // Add the newly unlocked achievements to the user's lifetime total
  user.stats.totalAchievements += newlyUnlocked.length;

  // ⬅️ FIX 1: ACTUALLY DEPOSIT THE BASE REWARDS INTO THE USER'S ACCOUNT!
  const awardResult = user.awardCurrency(finalXpAwarded, goldAwarded);

  // Check for Streak Milestone Achievement (Every 7 days)
  const milestoneReached = newStreak > 0 && newStreak % 7 === 0;
  if (milestoneReached) {
    user.stats.totalAchievements += 1;
  }

  user.markModified("stats");

  await user.save();

  // 2. PASS THE LEVELED UP FLAG TO THE FRONTEND
  const levelResult = {
    level: user.level,
    xp: user.xp,
    xpProgress: user.xpProgress,
    leveledUp: awardResult.leveledUp, // ⬅️ THIS FIXES THE POPUP!
    prevLevel: awardResult.prevLevel
  };

  return {
    updatedHabit: habit,
    newlyUnlocked: newlyUnlockedIds, // ⬅️ The router will automatically pass this to the frontend!
    streakResult: {
      previousStreak: newStreak === 1 ? 0 : newStreak - 1,
      newStreak,
      milestoneReached,
      multiplier,
      shieldUsed: missedYesterday && hasShield,
    },
    rewards: { xpAwarded: finalXpAwarded, goldAwarded, xpBoostActive: hasXpBoost },
    levelResult,
    user: {
      xp: user.xp, gold: user.gold, level: user.level, xpProgress: user.xpProgress,
      activePowerups: user.activePowerups,
      stats: user.stats, // ⬅️ Send stats to the frontend!
      unlockedAchievements: user.unlockedAchievements // Send to frontend to update the UI
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

    const user = await ensureUser(userId);
    const currentDate = getDateIsoInTimeZone(user.timezone);
    const yesterday = getYesterday(currentDate); // ⬅️ Get yesterday's date using your helper function

    const habits = await Habit.find({ userId, isArchived: false }).sort({ createdAt: 1 });
    // ⬇️ 1. Variable to track the true highest streak across all habits
    let actualHighestStreak = 0;
    let userNeedsSave = false;

    for (let habit of habits) {
      let needsSave = false;

      // ── 1. LAZY ROLLOVER: BROKEN STREAK RESET ──
      // If the habit wasn't completed today AND wasn't completed yesterday, the streak is dead.
      if (
        habit.currentStreak > 0 &&
        habit.lastCompletedDate !== currentDate &&
        habit.lastCompletedDate !== yesterday
      ) {
        habit.currentStreak = 0;
        needsSave = true;
      }

      // ── 2. LAZY ROLLOVER: MILESTONE WIPE ──
      // If the habit wasn't completed today, wipe the milestones for a fresh start
      if (
        habit.lastCompletedDate !== currentDate &&
        habit.lastInteractedDate !== currentDate &&
        habit.milestones.length > 0
      ) {
        const hasStuckMilestones = habit.milestones.some(m => m.isCompleted);

        if (hasStuckMilestones) {
          habit.milestones.forEach(m => m.isCompleted = false);
          habit.markModified("milestones"); // Tell Mongoose the array changed!
          needsSave = true;
        }
      }

      // Save the cleaned-up habit to the database before sending to React
      if (needsSave) {
        await habit.save();
      }
      // ⬇️ 2. AUTO-SYNC SYTEM: If the user's global stat is lower than their actual highest habit, fix it!
      if (!user.stats) user.stats = { totalHabitsCompleted: 0, totalAchievements: 0, totalGoldSpent: 0, highestStreak: 0 };

      if ((user.stats.highestStreak || 0) < actualHighestStreak) {
        user.stats.highestStreak = actualHighestStreak;
        user.markModified("stats");
        await user.save();
      }
    }

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
// // POST /api/habits/:id/undo
// ─────────────────────────────────────────────────────────────────
router.post("/:id/undo", async (req, res) => {
  try {
    const { userId } = req.body;
    const user: any = await User.findById(userId); // Or ensureUser(userId)
    const currentDate = new Date().toISOString().split("T")[0]; // Or your timezone util

    const habit = await Habit.findOne({ _id: req.params.id, userId });
    if (!habit) return res.status(404).json({ error: "Habit not found" });

    // 1. Safety Check: Only undo if completed today
    if (habit.lastCompletedDate !== currentDate) {
      return res.status(400).json({ error: "Can only undo habits completed today" });
    }

    // 2. Find the Receipt
    const lastLog = habit.completionLog[habit.completionLog.length - 1];

    if (lastLog && lastLog.date === currentDate) {

      // ── STEP 3 FIXED: Invoke our new clean database model logic ──
      user.deductCurrency(lastLog.xpAwarded, lastLog.goldAwarded);
      // ── NEW: Deduct from lifetime stats ──
      if (user.stats && user.stats.totalHabitsCompleted > 0) {
        user.stats.totalHabitsCompleted -= 1;
      }
      await user.save(); // Virtual triggers (xpProgress) automatically evaluate cleanly here!

      // 4. Rollback Habit Stats
      habit.completionLog.pop();
      const previousLog = habit.completionLog[habit.completionLog.length - 1];
      habit.lastCompletedDate = previousLog ? previousLog.date : "";
      habit.currentStreak = lastLog.streakAtCompletion > 1 ? lastLog.streakAtCompletion - 1 : 0;
    }

    // 5. If it had milestones, uncheck the last one
    if (habit.milestones && habit.milestones.length > 0) {
      // Loop backwards to find the last completed milestone
      for (let i = habit.milestones.length - 1; i >= 0; i--) {
        if (habit.milestones[i].isCompleted) {
          habit.milestones[i].isCompleted = false;

          // CRITICAL: Tell Mongoose the array changed, or it won't save!
          habit.markModified("milestones");
          break;
        }
      }
    }

    await habit.save();
    res.json({ message: "Undo successful", habit, user });

  } catch (err: any) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

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

      // 🔴 ADD THIS CRITICAL LINE SO THE DATABASE ACTUALLY SAVES IT 🔴
      habit.markModified("milestones");

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
          message: "All milestones completed — habit auto-completed!",
          habit: result.updatedHabit,
          completion: {
            streakResult: result.streakResult,
            rewards: result.rewards,
            levelResult: result.levelResult,
            user: result.user,
          },
        });
      } else {
        // ── Just save the toggle ───────────────────────────────
        // ── THE FIX: Stamp the interaction date so it survives the rollover ──
        habit.lastInteractedDate = currentDate;

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
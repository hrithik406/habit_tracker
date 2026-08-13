import { Router, Request, Response } from "express";
import User from "../models/User";
import { ensureUser } from "../utils/ensureUser";
import { getAchievementById } from "../../shared/achievement"; // ⬅️ IMPORT YOUR SHARED DICTIONARY

const router = Router();

// PUT /api/users/:id/timezone
router.put("/:id/timezone", async (req: Request<{ id: string }, {}, { timezone?: string }>, res: Response): Promise<void> => {
  try {
    const { timezone } = req.body;
    if (!timezone) { res.status(400).json({ error: "timezone is required" }); return; }

    const user = await ensureUser(req.params.id, timezone);

    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: (err as Error).message });
  }
});

// PUT /api/users/:id/profile updation
// ── Update Player Profile (Username, Avatar, Showcase) ──
router.put('/:id/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, activeAvatar, showcase } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    // Update fields
    if (username !== undefined) user.username = username;
    if (activeAvatar !== undefined) user.activeAvatar = activeAvatar;
    if (showcase !== undefined) user.showcase = showcase;

    // ⬇️ ADD THIS: Check for Fashionista Achievement ⬇️
    if (activeAvatar !== undefined || showcase !== undefined) {
      const hasEco1 = user.unlockedAchievements.some(a => a.achievementId === "eco_1");
      if (!hasEco1) {
        user.unlockedAchievements.push({ 
          achievementId: "eco_1", 
          unlockedAt: new Date(), 
          isClaimed: false 
        } as any);
      }
    }

    await user.save();
    res.status(200).json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/users/:id
router.get("/:id", async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: (err as Error).message });
  }
});


// ── POST /api/users/:id/achievements/claim ──
// ── Claim an unlocked achievement reward ──
router.post("/:id/achievements/claim", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id; 
    const { achievementId } = req.body;

    if (!achievementId) {
      res.status(400).json({ error: "achievementId is required" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // 1. Check if they actually unlocked it
    const unlockedRecord = user.unlockedAchievements.find(
      (a) => a.achievementId === achievementId
    );

    if (!unlockedRecord) {
      res.status(400).json({ error: "You haven't unlocked this achievement yet!" });
      return;
    }

    // 2. Check if they already claimed it (Prevent double-dipping!)
    if (unlockedRecord.isClaimed) {
      res.status(400).json({ error: "Reward already claimed." });
      return;
    }

    // 3. Look up the reward amounts from the Shared Master Dictionary
    const achievementDef = getAchievementById(achievementId);
    if (!achievementDef) {
      res.status(400).json({ error: "Achievement definition not found." });
      return;
    }

    // 4. Update the claim status
    unlockedRecord.isClaimed = true;

    // 5. Deposit the currency using your model method
    const awardResult = user.awardCurrency(achievementDef.xp || 0, achievementDef.gold || 0);

    // Save the user securely to the database
    await user.save();

    res.status(200).json({
      message: "Reward claimed successfully!",
      awardResult,
      user
    });

  } catch (error) {
    console.error("Claim Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
import { Router, Request, Response } from "express";
import User from "../models/User";
import { SHOP_ITEMS } from "../../shared/item";

const router = Router();

interface BuyRequestBody {
  userId: string;
  itemId: string;
}

router.post(
  "/buy",
  async (req: Request<{}, {}, BuyRequestBody>, res: Response): Promise<void> => {
    try {
      const { userId, itemId } = req.body;

      if (!userId || !itemId) {
        res.status(400).json({ error: "userId and itemId are required" });
        return;
      }

      // 1. Find the target item in the server's secure catalog
      const item = SHOP_ITEMS.find((i) => i.id === itemId);
      if (!item) {
        res.status(404).json({ error: "Item not found in catalog" });
        return;
      }

      // 2. Fetch the user
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // 3. Security Check: Does the user already own this?
      const alreadyOwned = user.ownedRewards.some((r: any) => r.itemId === itemId);
      if (alreadyOwned) {
        res.status(409).json({ error: "You already own this item" });
        return;
      }

      // 4. Security Check: Is the user a high enough level?
      if (user.level < item.levelRequired) {
        res.status(403).json({ error: `Level ${item.levelRequired} required` });
        return;
      }

      // 5. Security Check: Can the user afford it?
      if (user.gold < item.cost) {
        res.status(400).json({ error: "Not enough gold" });
        return;
      }

      // 6. Execute Transaction
      user.gold -= item.cost;

      // ⬇️ UPDATE THEIR STATS ⬇️
      if (!user.stats) user.stats = { totalHabitsCompleted: 0, totalAchievements: 0, totalGoldSpent: 0, highestStreak: 0 };
      user.stats.totalGoldSpent = (user.stats.totalGoldSpent || 0) + item.cost;

      // Save to the user's inventory
      user.ownedRewards.push({ itemId: item.id, name: item.name, purchasedAt: new Date() });

      // ── NEW: REAL BIG SPENDER LOGIC ──
      // Check if they finally hit the 1,000 gold mark!
      if (user.stats.totalGoldSpent >= 1000) {
        const hasEcoSpend = user.unlockedAchievements.some((a: any) => a.achievementId === "eco_spend");
        if (!hasEcoSpend) {
          user.unlockedAchievements.push({
            achievementId: "eco_spend",
            unlockedAt: new Date(),
            isClaimed: false
          } as any);
        }
      }

      await user.save();

      // Send the updated user data back to the frontend
      res.json({
        message: `Successfully purchased ${item.name}`,
        user: {
          gold: user.gold,
          ownedRewards: user.ownedRewards,
          unlockedAchievements: user.unlockedAchievements, // ⬅️ Sent to UI for instant notification!
        },
      });
    } catch (err) {
      res.status(500).json({ error: "Server error processing transaction", details: (err as Error).message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────
// POST /api/rewards/equip
// ─────────────────────────────────────────────────────────────────
router.post("/equip", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, itemId, category } = req.body;

    if (!userId || !itemId || !category) {
      res.status(400).json({ error: "userId, itemId, and category are required" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Security Check: Make sure they actually own it before equipping!
    const ownsItem = user.ownedRewards.some((r: any) => r.itemId === itemId);
    if (!ownsItem) {
      res.status(403).json({ error: "You do not own this item" });
      return;
    }

// Toggle & Consume logic
    if (category === "theme") {
      user.activeTheme = user.activeTheme === itemId ? null : itemId;
    } else if (category === "cosmetic") {
      user.activeAvatar = user.activeAvatar === itemId ? null : itemId;
    } else if (category === "powerup") {
      
      // 1. CONSUME THE ITEM: Remove one instance of it from their inventory
      const inventoryIndex = user.ownedRewards.findIndex((r: any) => r.itemId === itemId);
      if (inventoryIndex > -1) {
        user.ownedRewards.splice(inventoryIndex, 1);
      }

      // 2. STACK THE DURATION
      const existingPowerup = user.activePowerups.find((p: any) => p.itemId === itemId);
      
      if (existingPowerup) {
        // It is already active! Add exactly 24 hours to its CURRENT expiration time
        const currentExpTime = new Date(existingPowerup.expiresAt).getTime();
        existingPowerup.expiresAt = new Date(currentExpTime + (24 * 60 * 60 * 1000));
      } else {
        // It is not active yet. Start a fresh 24-hour timer from right now!
        const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000));
        user.activePowerups.push({ itemId, expiresAt });
      }
    }

    // ── ⬇️ NEW: FASHIONISTA ACHIEVEMENT ⬇️ ──
    // Triggers if they equip a cosmetic (avatar) or a theme!
    if (category === "cosmetic" || category === "theme") {
      const hasEco1 = user.unlockedAchievements.some((a: any) => a.achievementId === "eco_1");
      if (!hasEco1) {
        user.unlockedAchievements.push({
          achievementId: "eco_1",
          unlockedAt: new Date(),
          isClaimed: false
        } as any);
      }
    }

    // CRITICAL: Force Mongoose to save the array mutations!
    user.markModified("ownedRewards");
    user.markModified("activePowerups");

    await user.save();

    res.json({
      message: `Successfully activated ${category}`,
      user: {
        activeTheme: user.activeTheme,
        activeAvatar: user.activeAvatar,
        activePowerups: user.activePowerups,
        ownedRewards: user.ownedRewards, // ⬅️ NEW: Sent to UI so React knows the item is gone!
        unlockedAchievements: user.unlockedAchievements, 
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error equipping item", details: (err as Error).message });
  }
});

export default router;
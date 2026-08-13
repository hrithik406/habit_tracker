// ── shared/achievements.ts ───────────────────────────────────────────

export interface AchievementItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
  xp: number;
  gold: number;
  rewardText?: string; // Optional, because not all achievements have bonus items
}

export interface AchievementCategory {
  category: string;
  items: AchievementItem[];
}

// ── Apply the types to your array ────────────────────────────────────

export const ACHIEVEMENTS_DATA: AchievementCategory[] = [
  {
    category: "Streaks & Consistency",
    items: [
      { id: "streak_3", title: "Spark", desc: "Reach a 3-day streak on any habit.", icon: "🔥", xp: 50, gold: 25 },
      { id: "streak_7", title: "Ignition", desc: "Reach a 7-day streak on any habit.", icon: "🧨", xp: 150, gold: 100 },
      { id: "streak_21", title: "Habitual", desc: "Reach a 21-day streak. Science says it's a habit now!", icon: "🧠", xp: 500, gold: 300, rewardText: "Free Streak Shield" },
      { id: "streak_100", title: "Unbreakable", desc: "Reach a 100-day streak. Pure discipline.", icon: "💎", xp: 2000, gold: 1000, rewardText: "Diamond Badge" },
      { id: "streak_365", title: "Ascension", desc: "A full year of relentless consistency.", icon: "🐉", xp: 10000, gold: 5000, rewardText: "Golden Dragon Avatar" },
    ]
  },
  {
    category: "Lifetime Milestones",
    items: [
      { id: "grind_1", title: "First Steps", desc: "Complete your very first habit.", icon: "🌱", xp: 50, gold: 50 },
      { id: "grind_100", title: "Century Club", desc: "Complete 100 total habits across your account.", icon: "💯", xp: 500, gold: 500 },
      { id: "grind_1000", title: "Marathoner", desc: "Complete 1,000 total habits. A true master.", icon: "🏃", xp: 2500, gold: 2000, rewardText: "Titan Rank" },
    ]
  },
  {
    category: "Exploration & Economy",
    items: [
      { id: "eco_1", title: "Fashionista", desc: "Change your avatar or equip a profile badge.", icon: "🎩", xp: 50, gold: 50 },
      { id: "eco_spend", title: "Big Spender", desc: "Spend your first 1,000 Gold in the Reward Shop.", icon: "🛍️", xp: 200, gold: 0 },
      { id: "eco_shield", title: "Close Call", desc: "Have a Streak Shield automatically save a missed habit.", icon: "🚑", xp: 100, gold: 0, rewardText: "First Aid Badge" },
    ]
  }
];

// Helper to instantly find an achievement's data by its ID
export const getAchievementById = (id: string): AchievementItem | null => {
  for (const category of ACHIEVEMENTS_DATA) {
    const found = category.items.find(item => item.id === id);
    if (found) return found;
  }
  return null;
};
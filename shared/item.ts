// src/data/items.ts
// ── Types ──────────────────────────────────────────────────────────
export type ShopCategory = "theme" | "cosmetic" | "powerup";

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  levelRequired: number;
  category: "theme" | "cosmetic" | "powerup";
  icon: string;
}

// ── THE MASTER CATALOG ──────────────────────────────────────────────
// From now on, you ONLY add new items right here!
export const SHOP_ITEMS: ShopItem[] = [
  { id: "theme_dark", name: "Obsidian Theme", description: "A sleek, pitch-black dashboard.", cost: 50, levelRequired: 1, category: "theme", icon: "🌙" },
  { id: "theme_aurora", name: "Aurora Theme", description: "Neon greens and purples.", cost: 120, levelRequired: 5, category: "theme", icon: "🌌" },
  { id: "theme_monochrome", name: "Monochrome Premium", description: "A luxurious, high-contrast grayscale aesthetic.", cost: 150, levelRequired: 6, category: "theme", icon: "🎩" },
  { id: "streak_shield", name: "Streak Shield", description: "Protects your streak if you miss one day.", cost: 80, levelRequired: 3, category: "powerup", icon: "🛡️" },
  { id: "xp_boost", name: "XP Surge (24h)", description: "Double XP for 24 hours.", cost: 100, levelRequired: 4, category: "powerup", icon: "⚡" },
  { id: "badge_dragon", name: "Dragon Badge", description: "A fierce dragon profile picture.", cost: 200, levelRequired: 8, category: "cosmetic", icon: "🐉" },
  { id: "badge_legend", name: "Legend Badge", description: "Show everyone you are a master.", cost: 500, levelRequired: 15, category: "cosmetic", icon: "👑" },
  { id: "badge_target", name: "Target Badge", description: "Perfect for focus habits.", cost: 30, levelRequired: 2, category: "cosmetic", icon: "🎯" },
  { id: "badge_music", name: "Music Badge", description: "For the artistic souls.", cost: 30, levelRequired: 2, category: "cosmetic", icon: "🎸" },
  { id: "badge_writer", name: "Writer Badge", description: "Log your journaling.", cost: 30, levelRequired: 3, category: "cosmetic", icon: "✍️" },
  { id: "badge_brain", name: "Brain Badge", description: "For mindfulness and learning.", cost: 50, levelRequired: 3, category: "cosmetic", icon: "🧠" },
  { id: "badge_lift", name: "Lifter Badge", description: "Track those heavy gains.", cost: 50, levelRequired: 4, category: "cosmetic", icon: "🏋️" },
  { id: "badge_art", name: "Artist Badge", description: "Express your creativity.", cost: 50, levelRequired: 4, category: "cosmetic", icon: "🎨" },
  { id: "badge_tech", name: "Tech Badge", description: "For coding and deep work.", cost: 50, levelRequired: 5, category: "cosmetic", icon: "💻" },
  { id: "badge_cycle", name: "Cycling Badge", description: "Hit the road.", cost: 50, levelRequired: 5, category: "cosmetic", icon: "🚴" },
  { id: "badge_heart", name: "Health Badge", description: "A healthy heart.", cost: 80, levelRequired: 6, category: "cosmetic", icon: "🫀" },
  { id: "badge_nature", name: "Nature Badge", description: "Get outside more.", cost: 80, levelRequired: 6, category: "cosmetic", icon: "🌿" },
  { id: "badge_fireninja", name: "Fire Ninja", description: "Hot.", cost: 200,levelRequired: 6, category: "cosmetic", icon: "🥷🔥"}
];

// ── HELPER 1: For TopHeader & Profile Picture ──
export const getItemIcon = (itemId: string | undefined | null): string => {
  if (!itemId || itemId === "default") return "🧙‍♂️";
  const foundItem = SHOP_ITEMS.find(item => item.id === itemId);
  return foundItem ? foundItem.icon : "🧙‍♂️";
};

// ── HELPER 2: For Profile Modals (Avatars & Badges) ──
export const getCosmetics = () => {
  return SHOP_ITEMS.filter(item => item.category === "cosmetic");
};

// ── HELPER 3: For the Shop Page Categories ──
export const getItemsByCategory = (category: string) => {
  return SHOP_ITEMS.filter(item => item.category === category);
};



/**
 * Formats a given number of milliseconds into a HH:MM:SS string.
 * It strictly handles hours (even over 24), minutes, and seconds,
 * always ensuring 2 digits for MM:SS for a clean clock look.
 */
export const formatTimeRemaining = (ms: number): string => {
  if (ms <= 0) return "Expired";

  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;

  const hours = Math.floor(totalMinutes / 60);

  // padStart(2, '0') ensures "9" becomes "09", "12" stays "12"
  const formattedM = String(minutes).padStart(2, "0");
  const formattedS = String(seconds).padStart(2, "0");

  return `${hours}:${formattedM}:${formattedS}`;
};
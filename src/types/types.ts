// ── Reward (owned item snapshot) ──────────────────────────────────
export interface OwnedReward {
  itemId: string;
  name: string;
  purchasedAt: Date;
}

// ── XP progress breakdown ─────────────────────────────────────────
export interface XpProgress {
  current: number;
  required: number;
  percentage: number;
}

// ── User ──────────────────────────────────────────────────────────
export interface User {
  _id: string;
  username: string;
  email: string;
  xp: number;
  gold: number;
  level: number;
  xpProgress: XpProgress;
  ownedRewards: OwnedReward[];
  timezone: string;
  joinedAt: string;
}

// ── Completion log entry ──────────────────────────────────────────
export interface CompletionLogEntry {
  date: string;
  xpAwarded: number;
  goldAwarded: number;
  streakAtCompletion: number;
}

// ── Milestone ─────────────────────────────────────────────────────
export interface Milestone {
  _id: string;
  title: string;
  isCompleted: boolean;
}

// ── Frequency ─────────────────────────────────────────────────────
export type HabitFrequency = "daily" | "weekdays" | "weekends" | "custom";

// ── Time limit ────────────────────────────────────────────────────
export interface HabitTimeLimit {
  dueTime?: string;
  deadlineDate?: string;
  estimatedMinutes?: number;
}

// ── Habit ─────────────────────────────────────────────────────────
export interface Habit {
  _id: string;
  userId: string;
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
  completionLog: CompletionLogEntry[];
  milestones: Milestone[];          // ← NEW
  isArchived: boolean;
  timeLimit?: HabitTimeLimit;
  streakMultiplier?: number;
  todayComplete?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Form for creating a habit ─────────────────────────────────────
export interface CreateHabitForm {
  title: string;
  description: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  customDays: boolean[];
  baseXp: number;
  baseGold: number;
  timeLimit: HabitTimeLimit;
  milestones: Array<{ title: string }>;  // ← NEW
}

// ── API response shapes ───────────────────────────────────────────
export interface StreakResult {
  previousStreak: number;
  newStreak: number;
  milestoneReached: boolean;
  multiplier: number;
}

export interface RewardResult {
  xpAwarded: number;
  goldAwarded: number;
}

export interface LevelResult {
  leveledUp: boolean;
  prevLevel: number;
  newLevel: number;
  xpGained: number;
  goldGained: number;
}

export interface CompleteHabitResponse {
  message: string;
  streakResult: StreakResult;
  rewards: RewardResult;
  levelResult: LevelResult;
  user: User;
  habit: Habit;
}

// ── Milestone toggle response ─────────────────────────────────────
export interface ToggleMilestoneResponse {
  habit: Habit;
  /** Present only when toggling the last milestone triggers auto-complete */
  completion?: CompleteHabitResponse;
}

// ── Shop item ─────────────────────────────────────────────────────
export type ShopCategory = "theme" | "powerup" | "cosmetic";

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  levelRequired: number;
  category: ShopCategory;
}

// ── Last reward ───────────────────────────────────────────────────
export interface LastReward extends RewardResult, LevelResult, StreakResult {}

// ── App context state ─────────────────────────────────────────────
export interface AppState {
  user: User | null;
  habits: Habit[];
  loading: boolean;
  error: string | null;
  lastReward: LastReward | null;
}

// ── Nav ───────────────────────────────────────────────────────────
export type RoutePath = "/dashboard" | "/habits" | "/rewards" | "/progress";
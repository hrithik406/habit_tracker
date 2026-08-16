import mongoose, { Document, Schema, Model } from "mongoose";

// ── Sub-document interface ────────────────────────────────────────
export interface IOwnedReward {
  itemId: string;
  name: string;
  purchasedAt: Date;
}

// ── XP progress virtual shape ─────────────────────────────────────
export interface IXpProgress {
  current: number;
  required: number;
  percentage: number;
}

// ── awardCurrency return type ─────────────────────────────────────
export interface IAwardResult {
  leveledUp: boolean;
  prevLevel: number;
  newLevel: number;
  xpGained: number;
  goldGained: number;
}

// ── Document interface ────────────────────────────────────────────
export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  xp: number;
  gold: number;
  level: number;
  ownedRewards: IOwnedReward[];
  timezone: string;
  joinedAt: Date;
  activeTheme: string | null;
  activeAvatar: string | null;
  showcase?: (string | null)[];
  activePowerups: { itemId: string; expiresAt: Date }[]; // ⬅️ Changed to an array of object

  // virtuals
  xpForNextLevel: number;
  xpProgress: IXpProgress;

  // methods
  awardCurrency(xpGained: number, goldGained: number): IAwardResult;
  deductCurrency(xpToDeduct: number, goldToDeduct: number): { leveledDown: boolean; newLevel: number };
  // Stats
  stats: {
    totalHabitsCompleted: number;
    totalAchievements: number;
    totalGoldSpent: number;
    highestStreak: number;
  };

  unlockedAchievements: { achievementId: string; unlockedAt: Date; isClaimed: boolean }[];
}

// ── Model interface (for statics if needed later) ─────────────────
export type IUserModel = Model<IUser>;

// ── Schema ────────────────────────────────────────────────────────
const rewardSchema = new Schema<IOwnedReward>(
  {
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    purchasedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    xp: { type: Number, default: 0, min: 0 },
    gold: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1 },
    ownedRewards: [rewardSchema],
    timezone: { type: String, default: "UTC" },
    joinedAt: { type: Date, default: Date.now },

    // ⬇️ 2. ADDED THESE THREE LINES TO THE MONGOOSE SCHEMA ⬇️
    activeTheme: { type: String, default: null },
    activeAvatar: { type: String, default: null },
    showcase: { type: [String], default: [null, null, null, null] },
    activePowerups: {
      type: [{ itemId: String, expiresAt: Date }],
      default: []
    }, // ⬅️ Changed to an array of objects

    // Stats
    stats: {
      totalHabitsCompleted: { type: Number, default: 0 },
      totalAchievements: { type: Number, default: 0 },
      totalGoldSpent: { type: Number, default: 0 },
      highestStreak: { type: Number, default: 0 }
    },

    // Unlocked Achievements
    unlockedAchievements: {
      type: [{
        achievementId: { type: String, required: true },
        unlockedAt: { type: Date, default: Date.now },
        isClaimed: { type: Boolean, default: false } // ⬅️ NEW: Tracks if the user clicked "Claim"
      }],
      default: []
    },
  },
  { timestamps: true }
);

// ── Virtuals ──────────────────────────────────────────────────────

userSchema.virtual("xpForNextLevel").get(function (this: IUser): number {
  return Math.floor(100 * Math.pow(this.level + 1, 1.5));
});

userSchema.virtual("xpProgress").get(function (this: IUser): IXpProgress {
  const current = Math.floor(100 * Math.pow(this.level, 1.5));
  const next = Math.floor(100 * Math.pow(this.level + 1, 1.5));
  return {
    current: this.xp - current,
    required: next - current,
    percentage: Math.min(
      100,
      Math.floor(((this.xp - current) / (next - current)) * 100)
    ),
  };
});

// ── Instance methods ──────────────────────────────────────────────

userSchema.methods.awardCurrency = function (
  this: IUser,
  xpGained: number,
  goldGained: number
): IAwardResult {
  this.xp += xpGained;
  this.gold += goldGained;

  let leveledUp = false;
  const prevLevel = this.level;

  while (this.xp >= Math.floor(100 * Math.pow(this.level + 1, 1.5))) {
    this.level += 1;
    leveledUp = true;
  }

  return { leveledUp, prevLevel, newLevel: this.level, xpGained, goldGained };
};

userSchema.methods.deductCurrency = function (
  this: IUser,
  xpToDeduct: number,
  goldToDeduct: number
) {
  // 1. Subtract the currency safely, making sure gold never falls below 0
  this.gold = Math.max(0, this.gold - goldToDeduct);
  this.xp = Math.max(0, this.xp - xpToDeduct);

  let leveledDown = false;

  // 2. Roll back levels if total absolute XP drops below the current level's minimum entrance threshold
  while (this.level > 1 && this.xp < Math.floor(100 * Math.pow(this.level, 1.5))) {
    this.level -= 1;
    leveledDown = true;
  }

  return { leveledDown, newLevel: this.level };
};

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

const User: IUserModel = mongoose.model<IUser, IUserModel>("User", userSchema);
export default User;
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
  // virtuals
  xpForNextLevel: number;
  xpProgress: IXpProgress;
  // methods
  awardCurrency(xpGained: number, goldGained: number): IAwardResult;
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

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

const User: IUserModel = mongoose.model<IUser, IUserModel>("User", userSchema);
export default User;
import User, { IUser } from "../models/User";

function buildGuestUser(userId: string, timezone = "UTC") {
  return {
    _id: userId,
    username: `guest-${userId}`,
    email: `guest-${userId}@habitquest.local`,
    passwordHash: `guest-${userId}`,
    timezone,
  };
}

export async function ensureUser(userId: string, timezone = "UTC"): Promise<IUser> {
  const existing = await User.findById(userId);
  if (existing) {
    if (timezone && existing.timezone !== timezone) {
      existing.timezone = timezone;
      await existing.save();
    }
    return existing;
  }

  return User.create(buildGuestUser(userId, timezone));
}
"use client";
import React, { ReactElement, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import type { ShopCategory, ShopItem, User } from "../types/types";

// ── Shop catalog ──────────────────────────────────────────────────
const SHOP_ITEMS: ShopItem[] = [
  {
    id: "theme_dark",
    name: "Obsidian Theme",
    description: "Unlock a deep charcoal dark theme for the dashboard.",
    icon: "🌑",
    cost: 50,
    levelRequired: 1,
    category: "theme",
  },
  {
    id: "theme_aurora",
    name: "Aurora Theme",
    description: "A northern-lights gradient dashboard skin.",
    icon: "🌌",
    cost: 120,
    levelRequired: 5,
    category: "theme",
  },
  {
    id: "streak_shield",
    name: "Streak Shield",
    description: "Protects your streak from a single missed day. One-time use.",
    icon: "🛡️",
    cost: 80,
    levelRequired: 3,
    category: "powerup",
  },
  {
    id: "xp_boost",
    name: "XP Surge (24h)",
    description: "Double XP gains for the next 24 hours.",
    icon: "⚡",
    cost: 100,
    levelRequired: 4,
    category: "powerup",
  },
  {
    id: "avatar_dragon",
    name: "Dragon Avatar",
    description: "Exclusive dragon avatar frame for your profile.",
    icon: "🐉",
    cost: 200,
    levelRequired: 8,
    category: "cosmetic",
  },
  {
    id: "badge_legend",
    name: "Legend Badge",
    description: "Show everyone you reached the highest tier.",
    icon: "🏆",
    cost: 500,
    levelRequired: 15,
    category: "cosmetic",
  },
];

const CATEGORIES: Array<"all" | ShopCategory> = ["all", "theme", "powerup", "cosmetic"];

// ── Helpers ───────────────────────────────────────────────────────
function canAfford(user: User | null, item: ShopItem): boolean {
  return (user?.gold ?? 0) >= item.cost;
}

function meetsLevel(user: User | null, item: ShopItem): boolean {
  return (user?.level ?? 1) >= item.levelRequired;
}

function isOwned(user: User | null, itemId: string): boolean {
  return user?.ownedRewards?.some((r:any) => r.itemId === itemId) ?? false;
}

// ── Toast state ───────────────────────────────────────────────────
interface ToastState {
  type: "success" | "error";
  msg: string;
}

// ── ShopItemCard ──────────────────────────────────────────────────
interface ShopItemCardProps {
  item: ShopItem;
  user: User | null;
  onBuy: (item: ShopItem) => void;
  buying: boolean;
}

function ShopItemCard({ item, user, onBuy, buying }: ShopItemCardProps): ReactElement {
  const owned   = isOwned(user, item.id);
  const afford  = canAfford(user, item);
  const leveled = meetsLevel(user, item);
  const locked  = !leveled;
  const canBuy  = !owned && !locked && afford && !buying;

  return (
    <motion.div
      layout
      whileHover={canBuy ? { scale: 1.02 } : {}}
      className={`relative p-4 rounded-2xl border flex flex-col gap-3 transition-colors
        ${
          owned
            ? "bg-violet-900/20 border-violet-500/40"
            : locked
            ? "bg-slate-900/60 border-slate-800 opacity-60"
            : "bg-slate-900 border-slate-700"
        }`}
    >
      {/* Lock overlay */}
      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-slate-950/60 z-10">
          <span className="text-2xl">🔒</span>
          <span className="text-xs text-slate-400 mt-1">
            Level {item.levelRequired} required
          </span>
        </div>
      )}

      {/* Icon + name */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-xl text-2xl shrink-0">
          {item.icon}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-white truncate">{item.name}</p>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            {item.category}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto">
        <span
          className={`text-sm font-bold flex items-center gap-1 ${
            owned ? "text-violet-400" : afford ? "text-yellow-400" : "text-red-400"
          }`}
        >
          {owned ? "✅ Owned" : <>🪙 {item.cost}</>}
        </span>

        {!owned && (
          <motion.button
            whileTap={canBuy ? { scale: 0.94 } : {}}
            onClick={() => canBuy && onBuy(item)}
            disabled={!canBuy}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${
                canBuy
                  ? "bg-violet-600 hover:bg-violet-500 text-white cursor-pointer"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
          >
            {buying ? "Buying…" : !afford ? "Not enough gold" : "Buy"}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ── RewardShop ────────────────────────────────────────────────────
export default function RewardShop(): ReactElement {
  const { user } = useApp();
  const [category, setCategory] = useState<"all" | ShopCategory>("all");
  const [buying, setBuying] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const filtered: ShopItem[] =
    category === "all"
      ? SHOP_ITEMS
      : SHOP_ITEMS.filter((i) => i.category === category);

  async function handleBuy(item: ShopItem): Promise<void> {
    if (buying) return;
    setBuying(item.id);
    try {
      // POST /api/rewards/buy  { userId, itemId }
      await new Promise<void>((r) => setTimeout(r, 600)); // simulated
      setToast({ type: "success", msg: `Purchased ${item.name}!` });
    } catch {
      setToast({ type: "error", msg: "Purchase failed. Try again." });
    } finally {
      setBuying(null);
      setTimeout(() => setToast(null), 2500);
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-white">Reward Shop</h2>
          <p className="text-sm text-slate-400">Spend your gold on exclusive upgrades</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-xl w-fit">
          <span className="text-yellow-400 font-bold text-lg">🪙 {user?.gold ?? 0}</span>
          <span className="text-xs text-slate-400">available</span>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors
              ${
                category === cat
                  ? "bg-violet-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <ShopItemCard
              item={item}
              user={user}
              onBuy={handleBuy}
              buying={buying === item.id}
            />
          </motion.div>
        ))}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl z-50
              ${
                toast.type === "success"
                  ? "bg-emerald-600 text-white"
                  : "bg-red-600 text-white"
              }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
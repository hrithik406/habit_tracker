"use client";

import React, { useState, ReactElement } from "react";
import { useApp } from "../context/AppContext";
import type { ShopCategory, User } from "../types/types";
import { SHOP_ITEMS, ShopItem } from "@/../shared/item";


export default function RewardShop(): ReactElement {
  const { user, updateUser, toggleEquip } = useApp();

  const [category, setCategory] = useState<"all" | ShopCategory>("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

  const isEquipped = (itemId: string, itemCategory: string): boolean => {
    if (itemCategory === "theme") return user?.activeTheme === itemId;
    if (itemCategory === "cosmetic") return user?.activeAvatar === itemId;
    if (itemCategory === "powerup") return !!user?.activePowerups?.some((p) => p.itemId === itemId);
     return false;
  };

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  async function handleBuy(item: ShopItem): Promise<void> {
    if (loadingId || !user) return;
    setLoadingId(item.id);
    try {
      const res = await fetch(`${API_BASE}/rewards/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, itemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Purchase failed");

      // Sync the user's currency and new inventory item
      updateUser({ gold: data.user.gold, ownedRewards: data.user.ownedRewards });
      showToast("success", data.message);
    } catch (err) {
      showToast("error", (err as Error).message);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleEquip(item: ShopItem): Promise<void> {
    if (loadingId || !user) return;
    setLoadingId(item.id);
    try {
      await toggleEquip(item.id, item.category);
      showToast("success", `Updated active ${item.category}`);
    } catch (err) {
      showToast("error", "Failed to change equipment");
    } finally {
      setLoadingId(null);
    }
  }

  const displayItems = SHOP_ITEMS.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    return true;
  });

  return (
    <div className="p-4 space-y-6">

      {/* ── Header ── */}
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

      {/* ── Category Filters ── */}
      <div className="flex gap-2">
        {["all", "theme", "cosmetic", "powerup"].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat as typeof category)}
            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${category === cat
              ? "bg-white text-slate-900"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
              }`}
          >
            {cat === "all" ? "All" : `${cat}s`}
          </button>
        ))}
      </div>

      {/* ── Item Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayItems.map((item) => (
          <ShopItemCard
            key={item.id}
            item={item}
            user={user}
            isLoading={loadingId === item.id}
            equipped={isEquipped(item.id, item.category)}
            onBuy={() => handleBuy(item)}
            onEquip={() => handleEquip(item)}
          />
        ))}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg text-sm font-semibold shadow-lg z-50 ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Refactored ShopItemCard Component ───────────────────────────────
function ShopItemCard({
  item,
  user,
  isLoading,
  equipped,
  onBuy,
  onEquip,
}: {
  item: ShopItem;
  user: User | null;
  isLoading: boolean;
  equipped: boolean;
  onBuy: () => void;
  onEquip: () => void;
}) {
  // Check conditions
  const owned = user?.ownedRewards?.some((r) => r.itemId === item.id);
  const isLocked = (user?.level ?? 1) < item.levelRequired;
  const cantAfford = (user?.gold ?? 0) < item.cost;

  // Render the proper button based on item properties
  const renderActionButton = () => {
    if (isLoading) {
      return (
        <button disabled className="w-full py-2 rounded-lg text-sm font-bold bg-slate-700 text-slate-400 cursor-not-allowed">
          Processing...
        </button>
      );
    }

    // ── Case 1: Powerup Rules ──
    if (item.category === "powerup") {
      if (equipped) {
        return (
          <button disabled className="w-full py-2 rounded-lg text-sm font-bold bg-emerald-700/40 text-emerald-400 border border-emerald-500/30 cursor-not-allowed">
            Active (24h)
          </button>
        );
      }

      if (owned) {
        return (
          <button
            onClick={onEquip}
            className="w-full py-2 rounded-lg text-sm font-bold transition-colors bg-emerald-600 text-white hover:bg-emerald-500"
          >
            Activate
          </button>
        );
      }

      return (
        <button
          onClick={onBuy}
          disabled={isLocked || cantAfford}
          className={`w-full py-2 rounded-lg text-sm font-bold transition-colors ${isLocked || cantAfford ? "bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-violet-600 text-white hover:bg-violet-500"
            }`}
        >
          {isLocked ? "Locked" : "Buy"}
        </button>
      );
    }

    // ── Case 2: Permanent Unlock rules (Themes & Cosmetics) ──
    if (owned) {
      return (
        <button
          onClick={onEquip}
          className={`w-full py-2 rounded-lg text-sm font-bold transition-colors ${equipped
            ? "bg-slate-700 text-white hover:bg-slate-600 border border-slate-600"
            : "bg-emerald-600 text-white hover:bg-emerald-500"
            }`}
        >
          {equipped ? "Active (Unequip)" : "Equip"}
        </button>
      );
    }

    // Default: Not owned yet, show purchase option
    return (
      <button
        onClick={onBuy}
        disabled={isLocked || cantAfford}
        className={`w-full py-2 rounded-lg text-sm font-bold transition-colors ${isLocked || cantAfford ? "bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-violet-600 text-white hover:bg-violet-500"
          }`}
      >
        {isLocked ? "Locked" : "Buy"}
      </button>
    );
  };

  return (
    <div className={`rounded-xl p-4 flex flex-col h-full border transition-all ${equipped ? "bg-slate-800/80 border-emerald-500/50 shadow-md shadow-emerald-950/20" : "bg-slate-800 border-slate-700"
      }`}>

      {/* Icon & Title */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-lg font-bold text-white">{item.name}</h3>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {item.category}
          </span>
        </div>
        <span className="text-3xl">{item.icon}</span>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-300 mt-2 mb-4 grow">
        {item.description}
      </p>

      {/* Show Price & Requirements ONLY if it hasn't been permanently unlocked yet */}
      {(!owned && item.category !== "powerup" || item.category === "powerup" && !equipped) && (
        <div className="flex justify-between items-center mb-4 text-sm font-semibold">
          <span className={cantAfford ? "text-red-400" : "text-yellow-400"}>
            🪙 {item.cost}
          </span>
          <span className={isLocked ? "text-red-400" : "text-violet-400"}>
            Lvl {item.levelRequired}
          </span>
        </div>
      )}

      {/* Dynamic Action Button */}
      {renderActionButton()}
    </div>
  );
}
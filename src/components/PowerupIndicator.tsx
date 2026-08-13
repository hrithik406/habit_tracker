"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SHOP_ITEMS, formatTimeRemaining } from "@/../shared/item"; // ⬅️ Import the shared items data

interface PowerupIndicatorProps {
  itemId: string;
  expiresAt: string | Date;
  hideTooltip?: boolean; // ⬅️ 1. NEW PROP: Controls if the card shows up!
}

export default function PowerupIndicator({ itemId, expiresAt, hideTooltip = false }: PowerupIndicatorProps) {
  const [timeLeftStr, setTimeLeftStr] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [hasExpired, setHasExpired] = useState(false);

  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  
  if (!item || item.category !== "powerup") return null;

  useEffect(() => {
    const expirationTime = new Date(expiresAt).getTime();

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const diff = expirationTime - now;

      if (diff <= 0) {
        setTimeLeftStr("Expired");
        setHasExpired(true);
        return; 
      }
      setTimeLeftStr(formatTimeRemaining(diff));
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (hasExpired) return null;

  return (
    <div 
      className="relative flex items-center justify-center group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── THE INDICATOR ICON ── */}
      {/* Removed cursor-help if tooltip is hidden so it acts like a normal icon */}
      <div className={`w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-colors ${!hideTooltip ? 'cursor-help group-hover:border-violet-500/50' : ''}`}>
        {item.icon}
      </div>

      {/* ── THE HOVER CARD (Tooltip) ── */}
      {/* 2. Only render the AnimatePresence block if hideTooltip is false! */}
      {!hideTooltip && (
        <AnimatePresence>
          {isHovered && (
            <motion.div
              // Original downward-opening animation
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-full mt-3 z-50 w-64 bg-slate-950 border border-slate-800 p-5 rounded-2xl shadow-2xl pointer-events-none"
            >
              {/* Upward pointing arrow */}
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950 border-t border-l border-slate-800 rotate-45" />

              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-2xl border border-slate-800 shadow-inner shrink-0">
                    {item.icon}
                  </div>
                  <h4 className="text-white font-bold text-lg leading-tight">
                    {item.name}
                  </h4>
                </div>

                <p className="text-slate-400 text-sm leading-relaxed">
                  {item.description}
                </p>

                <div className="border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                    Time Left
                  </span>
                  <span className="font-mono font-black text-md text-yellow-400 tracking-wider">
                    {timeLeftStr}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
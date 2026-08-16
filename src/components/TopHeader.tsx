"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useApp } from "../context/AppContext";
import { getItemIcon } from "@/../shared/item"; // (or wherever your items.ts is)
import PowerupIndicator from "./PowerupIndicator"; // ⬅️ 1. Import the new component!

export default function TopHeader() {
  const { user } = useApp();
  const pathname = usePathname(); 

  // Hide on profile page
  if (pathname === "/profile") return null;

  // Render a skeleton if user isn't loaded
  if (!user) return <div className="h-16 w-full border-b border-slate-800 bg-slate-950/80" />;

  return (
    <header className="max-lg:hidden sticky top-0 z-40 w-full h-16 flex items-center justify-end px-4 md:px-8 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      
      {/* ── 2. NEW FLEX CONTAINER FOR ACTIVE POWERUPS ── */}
      {user.activePowerups && user.activePowerups.length > 0 && (
        <div className="flex items-center gap-2.5 mr-6 border-r border-slate-800 pr-6 h-10">
          {user.activePowerups.map((pu) => (
            // 3. Render an indicator for each active powerup
            <PowerupIndicator 
              key={pu.itemId} 
              itemId={pu.itemId} 
              expiresAt={pu.expiresAt} 
            />
          ))}
        </div>
      )}

      {/* Profile Link (unchanged) */}
      <Link href="/profile">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex items-center gap-3 p-1 pr-4 rounded-full hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer group"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white group-hover:text-violet-400 transition-colors">
              {user.username || "Player"}
            </p>
            <p className="text-xs font-bold text-yellow-500">
              Lvl {user.level || 1}
            </p>
          </div>

          <motion.div 
            animate={{ y: [-3, 3, -3] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-10 h-10 rounded-full bg-slate-800 border-2 border-violet-500/50 flex items-center justify-center text-xl shadow-[0_0_10px_rgba(124,58,237,0.2)] group-hover:shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-shadow"
          >
            {getItemIcon(user.activeAvatar)}
          </motion.div>
        </motion.div>
      </Link>
    </header>
  );
}
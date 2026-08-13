"use client";
import React, { useState, useEffect, ReactNode, memo, ReactElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "../context/AppContext";
import type { User } from "../types/types";
import { motion, AnimatePresence } from "framer-motion"; // ⬅️ Added framer-motion
import PowerupIndicator from "./PowerupIndicator";

interface NavItem { href: string; label: string; icon: string; }

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "⚡" },
  { href: "/habits", label: "Habits", icon: "🔥" },
  { href: "/rewards", label: "Rewards", icon: "🏆" },
  { href: "/progress", label: "Progress", icon: "📊" },
  { href: "/achievements", label: "Achievements", icon: "📊" },
];

// ── XP Bar ────────────────────────────────────────────────────────
const XPBar = memo(function XPBar({ user }: { user: User | null }) {
  if (!user) return null;
  const pct = user.xpProgress?.percentage ?? 0;
  return (
    <div className="px-3 py-2">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>Level {user.level}</span>
        <span>{user.xpProgress?.current ?? 0} / {user.xpProgress?.required ?? 100} XP</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-violet-500 to-indigo-400 rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
});

// ── Currency badge ─────────────────────────────────────────────────
const CurrencyBadge = memo(function CurrencyBadge({ user }: { user: User | null }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2 text-sm">
      <span className="flex items-center gap-1 text-yellow-400 font-semibold">🪙 {user.gold ?? 0}</span>
      <span className="flex items-center gap-1 text-violet-400 font-semibold">✨ {user.xp ?? 0}</span>
    </div>
  );
});

// ── Sidebar (desktop) ─────────────────────────────────────────────
interface SidebarProps {
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
  user: User | null;
}

const Sidebar = memo(function Sidebar({ pathname, collapsed, onToggle, user }: SidebarProps) {
  return (
    <aside
      className="hidden lg:flex flex-col bg-slate-900 border-r border-slate-800 h-screen sticky top-0 overflow-hidden shrink-0 transition-[width] duration-200 ease-in-out"
      style={{ width: collapsed ? 64 : 220 }}
    >
      <div className="flex items-center justify-between px-3 py-4 border-b border-slate-800 min-h-15">
        {!collapsed && (
          <Link href="/dashboard" className="text-white font-bold text-lg tracking-tight">
            Habit<span className="text-violet-400">Quest</span>
          </Link>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-auto"
          aria-label="Toggle sidebar"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm transition-colors ${active
                ? "bg-violet-600/20 text-violet-300 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* {user?.activePowerups && user.activePowerups.length > 0 && (
        <div className="flex items-center gap-2.5 border-slate-800 pr-6 h-5">
          {user.activePowerups.map((pu) => (
            // 3. Render an indicator for each active powerup
            <PowerupIndicator
              key={pu.itemId}
              itemId={pu.itemId}
              expiresAt={pu.expiresAt}
            />
          ))}
        </div>
      )} */}

      {!collapsed && (
        <div className="border-t border-slate-800 pb-4">
          <div className="flex">
            <CurrencyBadge user={user} />
            {user?.activePowerups && user.activePowerups.length > 0 && (
              <div className="flex items-center gap-2.5 border-slate-800 ">
                {user.activePowerups.map((pu) => (
                  // 3. Render an indicator for each active powerup
                  <PowerupIndicator
                    key={pu.itemId}
                    itemId={pu.itemId}
                    expiresAt={pu.expiresAt}
                    hideTooltip={true} // Hide tooltip in sidebar
                  />
                ))}
              </div>
            )}
          </div>
          <XPBar user={user} />
        </div>
      )}
    </aside>
  );
});

// ── Bottom nav (mobile) ────────────────────────────────────────────
const BottomNav = memo(function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors relative ${active ? "text-violet-400" : "text-slate-500"
                }`}
            >
              <span className={`text-xl transition-transform duration-150 ${active ? "scale-110" : ""}`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && <div className="absolute -top-0.5 w-8 h-0.5 bg-violet-400 rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

// ── DashboardLayout ───────────────────────────────────────────────
interface DashboardLayoutProps { children: ReactNode; }

export default function DashboardLayout({ children }: DashboardLayoutProps): ReactElement {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useApp();
  const pathname = usePathname();

  return (
    <>
      <AnimatePresence mode="wait">
        {!user ? (
          /* ── Loading Splash Screen ── */
          <motion.div
            key="splash-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-slate-950"
          >
            <motion.div
              animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="w-16 h-16 rounded-3xl bg-violet-600 shadow-[0_0_40px_rgba(124,58,237,0.4)] mb-6 flex items-center justify-center"
            >
              <span className="text-3xl text-white">⚡</span>
            </motion.div>
            <h1 className="text-xl font-black tracking-[0.2em] text-white uppercase">
              Loading
            </h1>
          </motion.div>
        ) : (
          /* ── Main App Content ── */
          <motion.div
            key="dashboard-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex min-h-screen bg-slate-950 text-white"
          >
            <Sidebar
              pathname={pathname}
              collapsed={collapsed}
              onToggle={() => setCollapsed((c) => !c)}
              user={user}
            />

            <div className="flex-1 flex flex-col min-w-0">
              {/* Mobile top bar */}
              <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
                <Link href="/dashboard" className="text-white font-bold text-lg">
                  Habit<span className="text-violet-400">Quest</span>
                </Link>
                <CurrencyBadge user={user} />
              </header>

              <main className="flex-1 overflow-auto pb-20 lg:pb-0">
                {children}
              </main>
            </div>

            <BottomNav pathname={pathname} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
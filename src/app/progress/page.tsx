"use client";
import React, { ReactElement, useEffect, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import ContributionGraph from "../../components/ContributionGraph";
import type { CompletionLogEntry } from "@/types/types";

export default function ProgressPage(): ReactElement{
  const { habits, fetchHabits, user } = useApp();

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  const allLogs = useMemo<CompletionLogEntry[]>(
    () => habits.flatMap((h) => h.completionLog ?? []),
    [habits]
  );

  const longestStreak = useMemo(
    () => habits.reduce((max, h) => Math.max(max, h.longestStreak), 0),
    [habits]
  );

  const totalCompletions = allLogs.length;

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-white">Progress</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total completions", value: totalCompletions, icon: "✅", color: "text-emerald-400" },
          { label: "Longest streak",    value: `${longestStreak}d`, icon: "🔥", color: "text-orange-400" },
          { label: "Habits tracked",    value: habits.length,    icon: "📋", color: "text-violet-400" },
          { label: "Current level",     value: user?.level ?? 1, icon: "🎖️", color: "text-indigo-400" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-2xl">{icon}</span>
            <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Contribution graph */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <ContributionGraph completionLog={allLogs} title="Yearly Activity" timeZone={user?.timezone} />
      </div>

      {/* Per-habit streaks */}
      {habits.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white">Streak Leaderboard</h2>
          {[...habits]
            .sort((a, b) => b.currentStreak - a.currentStreak)
            .map((h) => (
              <div key={h._id} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                  style={{ backgroundColor: `${h.color}22` }}
                >
                  {h.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-white truncate">{h.title}</span>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">🔥 {h.currentStreak}d</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{
                        width: `${longestStreak > 0 ? (h.currentStreak / longestStreak) * 100 : 0}%`,
                        backgroundColor: h.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
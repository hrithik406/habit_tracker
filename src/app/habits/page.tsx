"use client";
import React, { ReactElement, useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import HabitCard from "../../components/HabitCard";
import AddHabitModal from "../../components/AddHabitModal";
import type { HabitFrequency } from "../../types/types";
import { getDateIsoInTimeZone } from "../../utils/date";

type FilterOption = "all" | "active" | "completed" | HabitFrequency;

export default function HabitsPage(): ReactElement {
  const { user, habits, fetchHabits } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<FilterOption>("all");
  const [search, setSearch] = useState("");

  const TODAY_ISO = useMemo(() => getDateIsoInTimeZone(user?.timezone), [user?.timezone]);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  const filtered = useMemo(() => {
    let list = habits.filter((h:any) => !h.isArchived);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((h:any) => h.title.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q));
    }

    switch (filter) {
      case "active": return list.filter((h:any) => h.lastCompletedDate !== TODAY_ISO);
      case "completed": return list.filter((h:any) => h.lastCompletedDate === TODAY_ISO);
      case "daily":
      case "weekdays":
      case "weekends":
      case "custom": return list.filter((h:any) => h.frequency === filter);
      default: return list;
    }
  }, [habits, filter, search, TODAY_ISO]);

  const completedCount = useMemo(() => habits.filter((h: any) => h.lastCompletedDate === TODAY_ISO).length, [habits, TODAY_ISO]);

  const FILTERS: { value: FilterOption; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Pending" },
    { value: "completed", label: "Done today" },
    { value: "daily", label: "Daily" },
    { value: "weekdays", label: "Weekdays" },
    { value: "weekends", label: "Weekends" },
    { value: "custom", label: "Custom" },
  ];

  return (
    <>
      <AddHabitModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      <div className="p-4 space-y-4 max-w-3xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Habits</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {completedCount}/{habits.length} completed today
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors shrink-0 shadow-lg shadow-violet-900/30"
          >
            <span className="text-base leading-none">+</span>
            New Habit
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search habits…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === value
                  ? "bg-violet-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Habit list */}
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-4 text-center">
            {search ? (
              <>
                <span className="text-4xl">🔍</span>
                <p className="text-sm text-slate-400">No habits match "{search}"</p>
                <button onClick={() => setSearch("")} className="text-xs text-violet-400 hover:underline">
                  Clear search
                </button>
              </>
            ) : habits.length === 0 ? (
              <>
                <span className="text-5xl">🌱</span>
                <p className="text-slate-400 text-sm">You haven't created any habits yet.</p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  + Create your first habit
                </button>
              </>
            ) : (
              <>
                <span className="text-4xl">✅</span>
                <p className="text-sm text-slate-400">No habits in this filter.</p>
                <button onClick={() => setFilter("all")} className="text-xs text-violet-400 hover:underline">
                  Show all
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((h: any) => <HabitCard key={h._id} habit={h} />)}
          </div>
        )}
      </div>
    </>
  );
}
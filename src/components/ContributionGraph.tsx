"use client";
import React, { useMemo, useState, useCallback, memo, ReactElement } from "react";
import type { CompletionLogEntry } from "../types/types";
import { getDateIsoInTimeZone } from "../utils/date";

interface ColorLevel {
  label: string;
  min: number;
  max: number;
  hex: string;
}

const LEVELS: ColorLevel[] = [
  { label: "None",   min: 0, max: 0,        hex: "#1e293b" },
  { label: "Low",    min: 1, max: 2,        hex: "#3b0764" },
  { label: "Medium", min: 3, max: 4,        hex: "#6d28d9" },
  { label: "High",   min: 5, max: 7,        hex: "#8b5cf6" },
  { label: "Max",    min: 8, max: Infinity, hex: "#c4b5fd" },
];

function getLevel(count: number): ColorLevel {
  return LEVELS.find((l) => count >= l.min && count <= l.max) ?? LEVELS[0];
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

interface GridCell {
  date: string;
  count: number;
  hex: string;
}

type WeekRow = Array<GridCell | null>;

function buildGrid(completionLog: CompletionLogEntry[], timeZone = "UTC"): WeekRow[] {
  const countMap: Record<string, number> = {};
  for (const entry of completionLog) {
    countMap[entry.date] = (countMap[entry.date] ?? 0) + 1;
  }

  const todayIso = getDateIsoInTimeZone(timeZone);
  const today = new Date(`${todayIso}T00:00:00Z`);

  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 363);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const weeks: WeekRow[] = [];
  let week: WeekRow = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    const iso = cursor.toISOString().split("T")[0];
    const count = countMap[iso] ?? 0;
    week.push({ date: iso, count, hex: getLevel(count).hex });

    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  while (week.length > 0 && week.length < 7) week.push(null);
  if (week.length) weeks.push(week);

  return weeks;
}

interface MonthLabel {
  month: number;
  weekIndex: number;
}

interface TooltipState {
  date: string;
  count: number;
}

// ── Pure cell — plain div, no Framer Motion ───────────────────────
// CSS handles the hover scale via Tailwind; no JS animation overhead.
interface CellProps {
  cell: GridCell | null;
  onEnter: (cell: GridCell) => void;
  onLeave: () => void;
}

const Cell = memo(function Cell({ cell, onEnter, onLeave }: CellProps) {
  if (!cell) {
    return <div style={{ width: 13, height: 13 }} />;
  }
  return (
    <div
      className="rounded-sm transition-transform duration-100 hover:scale-125 cursor-pointer"
      style={{ width: 13, height: 13, backgroundColor: cell.hex }}
      onMouseEnter={() => onEnter(cell)}
      onMouseLeave={onLeave}
    />
  );
});

// ── Week column — memoised so only changed weeks re-render ─────────
interface WeekColProps {
  week: WeekRow;
  onEnter: (cell: GridCell) => void;
  onLeave: () => void;
}

const WeekCol = memo(function WeekCol({ week, onEnter, onLeave }: WeekColProps) {
  return (
    <div className="flex flex-col" style={{ gap: 3, marginRight: 3 }}>
      {week.map((cell, di) => (
        <Cell key={di} cell={cell} onEnter={onEnter} onLeave={onLeave} />
      ))}
    </div>
  );
});

interface ContributionGraphProps {
  completionLog?: CompletionLogEntry[];
  title?: string;
  timeZone?: string;
}

export default function ContributionGraph({
  completionLog = [],
  title = "Activity",
  timeZone = "UTC",
}: ContributionGraphProps): ReactElement {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const weeks = useMemo<WeekRow[]>(() => buildGrid(completionLog, timeZone), [completionLog, timeZone]);

  const monthLabels = useMemo<MonthLabel[]>(() => {
    const labels: MonthLabel[] = [];
    let prevMonth: number | null = null;
    weeks.forEach((week, wi) => {
      const firstDay = week.find(Boolean) as GridCell | undefined;
      if (!firstDay) return;
      const month = new Date(`${firstDay.date}T00:00:00Z`).getUTCMonth();
      if (month !== prevMonth) {
        labels.push({ month, weekIndex: wi });
        prevMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  // Stable callbacks so WeekCol/Cell never re-render on tooltip changes
  const handleEnter = useCallback((cell: GridCell) => {
    setTooltip({ date: cell.date, count: cell.count });
  }, []);

  const handleLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // Pre-build month label lookup so we don't scan inside render
  const monthLabelMap = useMemo<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    for (const l of monthLabels) map[l.weekIndex] = l.month;
    return map;
  }, [monthLabels]);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-xs text-slate-400">
          {completionLog.length} completion{completionLog.length !== 1 ? "s" : ""} in the last year
        </span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div style={{ minWidth: weeks.length * 16 + 40 }}>
          {/* Month labels */}
          <div className="flex mb-1 ml-8">
            {weeks.map((_, wi) => (
              <div key={wi} style={{ width: 16, flexShrink: 0 }} className="text-[9px] text-slate-500">
                {wi in monthLabelMap ? MONTHS[monthLabelMap[wi]] : ""}
              </div>
            ))}
          </div>

          <div className="flex gap-0">
            {/* Day labels */}
            <div className="flex flex-col mr-2" style={{ gap: 3 }}>
              {DAYS.map((d, i) => (
                <div key={d} style={{ height: 13 }} className="text-[9px] text-slate-600 flex items-center">
                  {i % 2 === 1 ? d[0] : ""}
                </div>
              ))}
            </div>

            {/* Week columns — each memoised */}
            {weeks.map((week, wi) => (
              <WeekCol key={wi} week={week} onEnter={handleEnter} onLeave={handleLeave} />
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip — only this re-renders on hover, nothing else */}
      <div className="h-6">
        {tooltip && (
          <div className="text-xs text-slate-300 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg w-fit">
            <strong>{tooltip.count} completion{tooltip.count !== 1 ? "s" : ""}</strong>{" "}
            on {tooltip.date}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-slate-500">Less</span>
        {LEVELS.map((l) => (
          <div key={l.label} title={l.label} className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.hex }} />
        ))}
        <span className="text-[10px] text-slate-500">More</span>
      </div>
    </div>
  );
}
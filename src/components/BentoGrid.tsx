"use client";
import React, { ReactElement, ReactNode, memo } from "react";

// ── BentoCell — plain div, no motion re-animation on every render ──
interface BentoCellProps {
  children: ReactNode;
  span?: string;
  className?: string;
}

// memo so cells don't re-render when sibling state changes
export const BentoCell = memo(function BentoCell({
  children,
  span = "col-span-1",
  className = "",
}: BentoCellProps): ReactElement {
  return (
    <div
      className={`${span} ${className} bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden`}
    >
      {children}
    </div>
  );
});

// ── BentoGrid ─────────────────────────────────────────────────────
interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export default function BentoGrid({ children, className = "" }: BentoGridProps): ReactElement {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 w-full auto-rows-auto ${className}`}
    >
      {children}
    </div>
  );
}

// ── Convenience wrappers — all memoised ───────────────────────────
interface BentoConvenienceProps {
  children: ReactNode;
  className?: string;
}

export const BentoFull = memo(function BentoFull({ children, className = "" }: BentoConvenienceProps) {
  return (
    <BentoCell span="col-span-1 md:col-span-2 lg:col-span-4" className={className}>
      {children}
    </BentoCell>
  );
});

export const BentoHalf = memo(function BentoHalf({ children, className = "" }: BentoConvenienceProps) {
  return (
    <BentoCell span="col-span-1 md:col-span-1 lg:col-span-2" className={className}>
      {children}
    </BentoCell>
  );
});

export const BentoThreeQuarter = memo(function BentoThreeQuarter({ children, className = "" }: BentoConvenienceProps) {
  return (
    <BentoCell span="col-span-1 md:col-span-2 lg:col-span-3" className={className}>
      {children}
    </BentoCell>
  );
});

export const BentoQuarter = memo(function BentoQuarter({ children, className = "" }: BentoConvenienceProps) {
  return (
    <BentoCell span="col-span-1 md:col-span-1 lg:col-span-1" className={className}>
      {children}
    </BentoCell>
  );
});
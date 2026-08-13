// src/app/(app)/layout.tsx
import React from "react";
import DashboardLayout from "@/components/DashboardLayout"; // ⬅️ Check this path!
import AchievementPopup from "@/components/AchievementPopUp";
import TopHeader from "@/components/TopHeader";
import LevelUpPopup from "@/components/LevelUpPopUp";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LevelUpPopup />
      <AchievementPopup />
      <DashboardLayout>
        <TopHeader />
        {children}
      </DashboardLayout>
    </>
  );
}
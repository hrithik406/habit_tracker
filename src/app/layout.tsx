import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import Providers from "./providers";
import DashboardLayout from "../components/DashboardLayout";
import ThemeInjector from "@/components/ThemeInjector";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HabitQuest — Gamified Habit Tracker",
  description: "Build streaks, earn XP, level up your life.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Add suppressHydrationWarning here to tell React to ignore extension injections
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-full bg-slate-950 text-white flex flex-col"
        suppressHydrationWarning // AND add it here just to be safe!
      >
        <Providers>
          <ThemeInjector />
            {children}
        </Providers>
      </body>
    </html>
  );
}
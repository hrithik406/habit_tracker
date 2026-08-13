"use client";

import { useEffect } from "react";
import { useApp } from "../context/AppContext"; // Adjust path if needed!

export default function ThemeInjector() {
  const { user } = useApp();

  useEffect(() => {
    // 1. Grab the HTML body element
    const body = document.body;

    // 2. Strip away any existing themes so they don't overlap
    body.classList.remove("theme-obsidian", "theme-aurora", "theme-monochrome");

    // 3. Check the database and apply the correct CSS class!
    if (user?.activeTheme === "theme_dark") {
      body.classList.add("theme-obsidian");
    } else if (user?.activeTheme === "theme_aurora") {
      body.classList.add("theme-aurora");
    } else if (user?.activeTheme === "theme_monochrome") {
      body.classList.add("theme-monochrome");
    }

    // If it's null, it just falls back to your default Tailwind colors!
  }, [user?.activeTheme]);

  // This component doesn't render any HTML itself
  return null;
}
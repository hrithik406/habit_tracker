"use client";
import React, { ReactElement, ReactNode } from "react";
import { AppProvider } from "../context/AppContext";

// ── Stub — replace with real session/auth ─────────────────────────
const DEMO_USER_ID = "64f1a2b3c4d5e6f7a8b9c0d1";

export default function Providers({ children }: { children: ReactNode }): ReactElement {
  return <AppProvider userId={DEMO_USER_ID}>{children}</AppProvider>;
}
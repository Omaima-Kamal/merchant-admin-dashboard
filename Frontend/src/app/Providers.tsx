"use client";

import { AuthProvider } from "@/auth/AuthProvider";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
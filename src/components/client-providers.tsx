"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import type { AppSnapshot } from "@/domain/types";
import { AppProvider } from "@/components/app-provider";

export function ClientProviders({
  initialSnapshot,
  children,
}: {
  initialSnapshot: AppSnapshot;
  children: ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme={initialSnapshot.settings.theme}
      enableSystem
      disableTransitionOnChange
    >
      <AppProvider initialSnapshot={initialSnapshot}>{children}</AppProvider>
    </ThemeProvider>
  );
}

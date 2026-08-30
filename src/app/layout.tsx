import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { ClientProviders } from "@/components/client-providers";
import { getStore } from "@/server/store";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "HomeLab Commander", template: "%s · HomeLab Commander" },
  description: "Your infrastructure. One command center.",
  applicationName: "HomeLab Commander",
  metadataBase: new URL("https://home-lab-commander.vercel.app"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "HomeLab Commander",
    description:
      "A safe, local-first operations console for personally owned homelabs.",
    url: "/",
    siteName: "HomeLab Commander",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HomeLab Commander",
    description: "Explore a safe, interactive homelab operations showcase.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090d12",
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const snapshot = getStore().snapshot();
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClientProviders initialSnapshot={snapshot}>
          <AppShell>{children}</AppShell>
        </ClientProviders>
      </body>
    </html>
  );
}

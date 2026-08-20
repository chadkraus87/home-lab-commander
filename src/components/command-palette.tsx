"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  AlertTriangle,
  Box,
  FileText,
  HardDrive,
  LayoutDashboard,
  Monitor,
  Network,
  Search,
  Server,
  Settings,
  Wrench,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useApp } from "@/components/app-provider";
import { Button } from "@/components/ui";

const routes = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Devices", href: "/devices", icon: Monitor },
  { label: "Network topology", href: "/network", icon: Network },
  { label: "Services", href: "/services", icon: Server },
  { label: "Containers", href: "/containers", icon: Box },
  { label: "Monitoring", href: "/monitoring", icon: HardDrive },
  { label: "Alerts", href: "/alerts", icon: AlertTriangle },
  { label: "Lab notes", href: "/notes", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { snapshot } = useApp();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return [];
    return [
      ...snapshot.devices.map((item) => ({
        label: item.displayName,
        detail: `${item.primaryIp} · Device`,
        href: `/devices/${item.id}`,
        icon: Monitor,
      })),
      ...snapshot.services.map((item) => ({
        label: item.name,
        detail: `${item.host}:${item.port} · Service`,
        href: "/services",
        icon: Server,
      })),
      ...snapshot.containers.map((item) => ({
        label: item.name,
        detail: `${item.image} · Container`,
        href: "/containers",
        icon: Box,
      })),
      ...snapshot.notes.map((item) => ({
        label: item.title,
        detail: "Lab note",
        href: `/notes?note=${item.id}`,
        icon: FileText,
      })),
    ]
      .filter((item) =>
        `${item.label} ${item.detail}`.toLowerCase().includes(search),
      )
      .slice(0, 12);
  }, [query, snapshot]);
  const close = () => {
    setQuery("");
    onOpenChange(false);
  };
  const select = (href: string) => {
    router.push(href);
    close();
  };
  if (!open) return null;
  return (
    <div
      className="command-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <Command
        className="command-dialog"
        label="Global command palette"
        shouldFilter={false}
      >
        <div className="command-input-wrap">
          <Search size={18} />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search infrastructure or run a command…"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={close}
            aria-label="Close command palette"
          >
            <X size={17} />
          </Button>
        </div>
        <Command.List>
          <Command.Empty>
            No matching devices, services, containers, or notes.
          </Command.Empty>
          {query ? (
            <Command.Group heading="Search results">
              {results.map((item) => (
                <Command.Item
                  key={`${item.href}-${item.label}`}
                  value={`${item.href}-${item.label}`}
                  onSelect={() => select(item.href)}
                >
                  <item.icon size={17} />
                  <span>
                    {item.label}
                    <small>{item.detail}</small>
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : (
            <>
              <Command.Group heading="Navigate">
                {routes.map((item) => (
                  <Command.Item
                    key={item.href}
                    value={item.label}
                    onSelect={() => select(item.href)}
                  >
                    <item.icon size={17} />
                    <span>{item.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Commands">
                <Command.Item
                  value="toggle-theme"
                  onSelect={() => {
                    setTheme(resolvedTheme === "dark" ? "light" : "dark");
                    close();
                  }}
                >
                  <Wrench size={17} />
                  <span>
                    Toggle theme<small>Switch light and dark appearance</small>
                  </span>
                </Command.Item>
                <Command.Item
                  value="run-discovery"
                  onSelect={() => select("/settings?section=live")}
                >
                  <Network size={17} />
                  <span>
                    Run network discovery
                    <small>Review scope before scanning</small>
                  </span>
                </Command.Item>
              </Command.Group>
            </>
          )}
        </Command.List>
        <footer>
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </footer>
      </Command>
    </div>
  );
}

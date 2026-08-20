"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Command as CommandIcon,
  FileText,
  Gauge,
  LayoutDashboard,
  Menu,
  Monitor,
  Moon,
  Network,
  PackageOpen,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { calculateHealthScore } from "@/domain/health";
import { useApp } from "@/components/app-provider";
import { CommandPalette } from "@/components/command-palette";
import { Button } from "@/components/ui";
import { cn, titleCase } from "@/lib/utils";

const navGroups = [
  {
    label: "Command",
    items: [
      { label: "Overview", href: "/", icon: LayoutDashboard },
      { label: "Devices", href: "/devices", icon: Monitor },
      { label: "Network", href: "/network", icon: Network },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Services", href: "/services", icon: Server },
      { label: "Containers", href: "/containers", icon: Boxes },
      { label: "Monitoring", href: "/monitoring", icon: Gauge },
      { label: "Alerts", href: "/alerts", icon: AlertTriangle },
      { label: "Activity", href: "/activity", icon: Activity },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { label: "Inventory", href: "/inventory", icon: PackageOpen },
      { label: "Lab Notes", href: "/notes", icon: FileText },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { snapshot, toast, dismissToast } = useApp();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const health = useMemo(() => calculateHealthScore(snapshot), [snapshot]);
  const activeAlerts = snapshot.alerts.filter(
    (alert) => alert.status === "active",
  ).length;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const pathParts = pathname.split("/").filter(Boolean);
  return (
    <div className={cn("app-frame", collapsed && "sidebar-collapsed")}>
      {mobileOpen ? (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside className={cn("sidebar", mobileOpen && "mobile-open")}>
        <div className="brand">
          <div className="brand-mark">
            <CommandIcon size={19} />
          </div>
          <div className="brand-copy">
            <strong>HomeLab</strong>
            <span>Commander</span>
          </div>
          <Button
            className="mobile-close"
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </Button>
        </div>
        <div className="environment-card">
          <span className="live-pulse" />
          <div>
            <strong>
              {snapshot.hostedDemo
                ? "Hosted showcase"
                : snapshot.settings.mode === "demo"
                  ? "Demo environment"
                  : "Live environment"}
            </strong>
            <small>
              {snapshot.hostedDemo
                ? "Demo-only · ephemeral"
                : snapshot.settings.mode === "demo"
                  ? "Simulation running"
                  : "Simulation paused · tools on demand"}
            </small>
          </div>
        </div>
        <nav aria-label="Primary navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    className={cn("nav-link", active && "active")}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    onClick={() => setMobileOpen(false)}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                    {item.label === "Alerts" && activeAlerts > 0 ? (
                      <em>{activeAlerts}</em>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link
            className={cn(
              "nav-link",
              pathname.startsWith("/settings") && "active",
            )}
            href="/settings"
            onClick={() => setMobileOpen(false)}
          >
            <Settings size={18} />
            <span>Settings</span>
          </Link>
          <button
            className="collapse-button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={17} />
            ) : (
              <>
                <ChevronLeft size={17} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <Button
              className="mobile-menu"
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </Button>
            <div className="breadcrumbs">
              <Link href="/">HomeLab</Link>
              {pathParts.map((part, index) => (
                <span key={`${part}-${index}`}>
                  <ChevronRight size={13} />
                  {titleCase(part)}
                </span>
              ))}
            </div>
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              onClick={() => setCommandOpen(true)}
            >
              <Search size={16} />
              <span>Search infrastructure</span>
              <kbd>⌘ K</kbd>
            </button>
            <div className="health-chip">
              <span
                className={cn("health-dot", health.score < 70 && "attention")}
              />
              <span>Health</span>
              <strong>{health.score}</strong>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              aria-label="Toggle color theme"
            >
              {(mounted ? resolvedTheme : snapshot.settings.theme) ===
              "dark" ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </Button>
            <Link
              className="icon-link"
              href="/alerts"
              aria-label={`${activeAlerts} active notifications`}
            >
              <Bell size={18} />
              {activeAlerts ? <span>{activeAlerts}</span> : null}
            </Link>
          </div>
        </header>
        {snapshot.hostedDemo ? (
          <div className="hosted-privacy-banner" role="note">
            <ShieldCheck size={16} />
            <span>
              <strong>Browser-session demo:</strong> use example data only.
              Changes stay in this tab and reset when it closes.
            </span>
          </div>
        ) : null}
        <main className="page-content">{children}</main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      {toast ? (
        <div className={cn("toast", `toast-${toast.tone}`)} role="status">
          <span>{toast.message}</span>
          <button onClick={dismissToast} aria-label="Dismiss notification">
            <X size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

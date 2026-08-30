"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppSnapshot } from "@/domain/types";
import { advanceSimulation } from "@/simulation/engine";
import {
  applyHostedMutation,
  hostedSessionStorageKey,
  parseHostedSession,
} from "@/simulation/hosted-state";
import {
  applyDemoScenario,
  demoScenarioIds,
  type DemoScenarioId,
} from "@/simulation/scenarios";

interface AppContextValue {
  snapshot: AppSnapshot;
  mutate: (payload: unknown, successMessage?: string) => Promise<boolean>;
  replaceSnapshot: (snapshot: AppSnapshot) => void;
  loadDemoScenario: (scenario: DemoScenarioId) => void;
  busy: boolean;
  toast: { message: string; tone: "success" | "error" } | null;
  dismissToast: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  initialSnapshot,
  children,
}: {
  initialSnapshot: AppSnapshot;
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<AppContextValue["toast"]>(null);
  const tick = useRef(0);
  const pristineSnapshot = useRef(initialSnapshot);

  useEffect(() => {
    if (!initialSnapshot.hostedDemo) return;
    const timeout = window.setTimeout(() => {
      try {
        const requested = new URLSearchParams(window.location.search).get(
          "scenario",
        );
        setSnapshot(
          demoScenarioIds.includes(requested as DemoScenarioId)
            ? applyDemoScenario(initialSnapshot, requested as DemoScenarioId)
            : parseHostedSession(
                window.sessionStorage.getItem(hostedSessionStorageKey),
                initialSnapshot,
              ),
        );
      } catch {
        setToast({
          message:
            "Browser session storage is unavailable. Demo changes will last only until this page reloads.",
          tone: "error",
        });
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [initialSnapshot]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      tick.current += 1;
      setSnapshot((current) => advanceSimulation(current, tick.current));
    }, snapshot.settings.refreshSeconds * 1_000);
    return () => window.clearInterval(interval);
  }, [snapshot.settings.refreshSeconds]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4_000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const mutate = useCallback(
    async (payload: unknown, successMessage = "Saved") => {
      setBusy(true);
      try {
        if (snapshot.hostedDemo) {
          const result = applyHostedMutation(snapshot, payload);
          if (!result.ok) {
            setToast({ message: result.error, tone: "error" });
            return false;
          }
          setSnapshot(result.snapshot);
          try {
            window.sessionStorage.setItem(
              hostedSessionStorageKey,
              JSON.stringify(result.snapshot),
            );
          } catch {
            setToast({
              message:
                "Change applied for this page only because browser session storage is unavailable.",
              tone: "error",
            });
            return true;
          }
          setToast({ message: successMessage, tone: "success" });
          return true;
        }
        const response = await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body: unknown = await response.json();
        if (!response.ok) {
          const message =
            body && typeof body === "object" && "error" in body
              ? String(body.error)
              : "The change could not be saved.";
          setToast({ message, tone: "error" });
          return false;
        }
        setSnapshot(body as AppSnapshot);
        setToast({ message: successMessage, tone: "success" });
        return true;
      } catch {
        setToast({
          message: "HomeLab Commander could not reach its local server.",
          tone: "error",
        });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [snapshot],
  );

  const replaceSnapshot = useCallback((next: AppSnapshot) => {
    setSnapshot(next);
    if (!next.hostedDemo) return;
    try {
      window.sessionStorage.setItem(
        hostedSessionStorageKey,
        JSON.stringify(next),
      );
    } catch {
      setToast({
        message:
          "Demo state changed, but browser session storage is unavailable.",
        tone: "error",
      });
    }
  }, []);

  const loadDemoScenario = useCallback(
    (scenario: DemoScenarioId) => {
      replaceSnapshot(applyDemoScenario(pristineSnapshot.current, scenario));
    },
    [replaceSnapshot],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      snapshot,
      mutate,
      replaceSnapshot,
      loadDemoScenario,
      busy,
      toast,
      dismissToast: () => setToast(null),
    }),
    [snapshot, mutate, replaceSnapshot, loadDemoScenario, busy, toast],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}

"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  RotateCcw,
  X,
} from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Button } from "@/components/ui";
import {
  demoScenarioDescriptions,
  demoScenarioIds,
  type DemoScenarioId,
} from "@/simulation/scenarios";

const tourSteps = [
  {
    href: "/",
    title: "Command center",
    body: "Start with explainable health, capacity, alerts, and recent activity.",
  },
  {
    href: "/devices/atlas",
    title: "Device intelligence",
    body: "Inspect resource history, interfaces, services, workloads, and operator notes.",
  },
  {
    href: "/network",
    title: "Topology",
    body: "Explore the simulated network map and select a node for normalized details.",
  },
  {
    href: "/alerts",
    title: "Incident response",
    body: "Acknowledge example alerts, then try an outage or recovery scenario.",
  },
  {
    href: "/notes",
    title: "Runbooks",
    body: "Create a Markdown lab note; hosted edits remain only in this browser tab.",
  },
] as const;

export function HostedDemoExperience() {
  const { snapshot, loadDemoScenario } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedScenario = searchParams.get("scenario");
  const initialScenario = parseDemoScenario(requestedScenario);
  const [tourOpen, setTourOpen] = useState(searchParams.get("tour") === "1");
  const [step, setStep] = useState(0);
  const [scenario, setScenario] = useState<DemoScenarioId>(initialScenario);

  if (!snapshot.hostedDemo) return null;

  function selectScenario(next: DemoScenarioId) {
    setScenario(next);
    loadDemoScenario(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("scenario", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function navigate(nextStep: number) {
    setStep(nextStep);
    router.push(
      `${tourSteps[nextStep]?.href ?? "/"}?tour=1&scenario=${scenario}`,
    );
  }

  return (
    <>
      <section className="demo-controls" aria-label="Hosted demo controls">
        <div>
          <Clapperboard size={16} />
          <label htmlFor="demo-scenario">Scenario</label>
          <select
            id="demo-scenario"
            value={scenario}
            onChange={(event) =>
              selectScenario(parseDemoScenario(event.target.value))
            }
          >
            {demoScenarioIds.map((id) => (
              <option key={id} value={id}>
                {id[0]?.toUpperCase()}
                {id.slice(1)}
              </option>
            ))}
          </select>
          <span>{demoScenarioDescriptions[scenario]}</span>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={() => {
            setStep(0);
            setTourOpen(true);
          }}
        >
          Start guided tour
        </Button>
      </section>
      {tourOpen ? (
        <aside
          className="demo-tour"
          role="dialog"
          aria-modal="false"
          aria-labelledby="demo-tour-title"
        >
          <header>
            <span>
              Tour {step + 1} of {tourSteps.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTourOpen(false)}
              aria-label="Close guided tour"
            >
              <X size={16} />
            </Button>
          </header>
          <h2 id="demo-tour-title">{tourSteps[step]?.title}</h2>
          <p>{tourSteps[step]?.body}</p>
          <Button variant="ghost" size="small" onClick={() => navigate(step)}>
            Open this view
          </Button>
          <footer>
            <Button
              variant="ghost"
              size="small"
              disabled={step === 0}
              onClick={() => navigate(step - 1)}
            >
              <ChevronLeft size={14} /> Back
            </Button>
            {step < tourSteps.length - 1 ? (
              <Button size="small" onClick={() => navigate(step + 1)}>
                Next <ChevronRight size={14} />
              </Button>
            ) : (
              <Button
                size="small"
                onClick={() => {
                  setStep(0);
                  setTourOpen(false);
                }}
              >
                <RotateCcw size={14} /> Finish
              </Button>
            )}
          </footer>
        </aside>
      ) : null}
    </>
  );
}

function parseDemoScenario(value: string | null): DemoScenarioId {
  if (value === "capacity" || value === "outage" || value === "recovery")
    return value;
  return "balanced";
}

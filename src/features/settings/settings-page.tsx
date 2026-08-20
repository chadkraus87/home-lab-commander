"use client";

import { useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Activity,
  Box,
  Database,
  Download,
  Info,
  MonitorCog,
  Network,
  Palette,
  Play,
  Radar,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Upload,
  Wifi,
} from "lucide-react";
import type { AppSettings, AppSnapshot, DiscoveryResult } from "@/domain/types";
import { useApp } from "@/components/app-provider";
import {
  Badge,
  Button,
  Card,
  Field,
  PageHeader,
  SegmentedControl,
  StatusBadge,
} from "@/components/ui";

const sections = [
  { id: "general", label: "General", icon: Settings },
  { id: "live", label: "Environment", icon: Radar },
  { id: "networks", label: "Networks", icon: Network },
  { id: "monitoring", label: "Monitoring", icon: Activity },
  { id: "docker", label: "Docker", icon: Box },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "data", label: "Data", icon: Database },
  { id: "about", label: "About", icon: Info },
] as const;
type Section = (typeof sections)[number]["id"];

export function SettingsPage() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("section");
  const [section, setSection] = useState<Section>(
    sections.some((item) => item.id === requested)
      ? (requested as Section)
      : "general",
  );
  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Local application, monitoring, discovery, appearance, and data controls."
      />
      <div className="settings-layout">
        <Card className="settings-nav">
          <nav aria-label="Settings sections">
            {sections.map((item) => (
              <button
                key={item.id}
                className={section === item.id ? "active" : ""}
                onClick={() => setSection(item.id)}
              >
                <item.icon size={15} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </Card>
        <div className="settings-content">
          {section === "general" ? (
            <GeneralSettings />
          ) : section === "live" ? (
            <EnvironmentSettings />
          ) : section === "networks" ? (
            <NetworkSettings />
          ) : section === "monitoring" ? (
            <MonitoringSettings />
          ) : section === "docker" ? (
            <DockerSettings />
          ) : section === "appearance" ? (
            <AppearanceSettings />
          ) : section === "data" ? (
            <DataSettings />
          ) : (
            <AboutSettings />
          )}
        </div>
      </div>
    </>
  );
}

function GeneralSettings() {
  const { snapshot, mutate, busy } = useApp();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await updateSettings(
      mutate,
      snapshot.settings,
      {
        applicationName: String(form.get("applicationName")),
        refreshSeconds: Number(form.get("refreshSeconds")),
        timezone: String(form.get("timezone")),
        units: form.get("units") as AppSettings["units"],
      },
      "General settings saved",
    );
  }
  return (
    <SettingsCard
      title="General"
      description="Application identity and local display preferences."
      icon={<Settings />}
    >
      <form onSubmit={save}>
        <div className="form-grid">
          <Field label="Application name">
            <input
              name="applicationName"
              required
              defaultValue={snapshot.settings.applicationName}
            />
          </Field>
          <Field label="Refresh interval">
            <select
              name="refreshSeconds"
              defaultValue={snapshot.settings.refreshSeconds}
            >
              <option value="2">2 seconds</option>
              <option value="4">4 seconds</option>
              <option value="10">10 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
            </select>
          </Field>
          <Field label="Timezone">
            <input
              name="timezone"
              required
              defaultValue={snapshot.settings.timezone}
            />
          </Field>
          <Field label="Units">
            <select name="units" defaultValue={snapshot.settings.units}>
              <option value="metric">Metric</option>
              <option value="imperial">Imperial</option>
            </select>
          </Field>
        </div>
        <div className="form-actions">
          <Button type="submit" disabled={busy}>
            <Save size={14} />
            Save changes
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}

function EnvironmentSettings() {
  const { snapshot, mutate, busy } = useApp();
  const [step, setStep] = useState(1);
  const [activationOpen, setActivationOpen] = useState(
    snapshot.settings.mode === "live",
  );
  const [cidr, setCidr] = useState(
    snapshot.settings.approvedCidrs[0] ?? "192.168.1.0/24",
  );
  const [method, setMethod] = useState<"passive" | "ping">(
    snapshot.settings.discoveryMethod,
  );
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<DiscoveryResult[]>([]);
  const [scanError, setScanError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function runDiscovery() {
    setScanning(true);
    setScanError("");
    try {
      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cidr, method }),
      });
      const body = (await response.json()) as {
        results?: DiscoveryResult[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Discovery failed");
      const found = body.results ?? [];
      setResults(found);
      setSelected(new Set(found.map((item) => item.ip)));
      setStep(4);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Discovery failed");
    } finally {
      setScanning(false);
    }
  }
  async function promoteAndActivate() {
    for (const result of results.filter((item) => selected.has(item.ip))) {
      const saved = await mutate(
        {
          action: "add-device",
          data: {
            displayName: result.hostname ?? `Discovered ${result.ip}`,
            hostname:
              result.hostname ?? `host-${result.ip.replaceAll(".", "-")}`,
            primaryIp: result.ip,
            type: "unknown",
            location: "Unassigned",
            tags: ["discovered"],
          },
        },
        `Added ${result.ip}`,
      );
      if (!saved) return;
    }
    const activated = await updateSettings(
      mutate,
      snapshot.settings,
      { mode: "live", discoveryMethod: method },
      "Live Mode activated",
    );
    if (activated) {
      setActivationOpen(false);
      setStep(1);
    }
  }
  if (snapshot.hostedDemo)
    return (
      <SettingsCard
        title="Environment"
        description="This public deployment is intentionally limited to safe Demo Mode."
        icon={<Radar />}
      >
        <div className="mode-cards">
          <button className="active" type="button">
            <span>
              <Play />
            </span>
            <div>
              <strong>Hosted Demo</strong>
              <p>Interactive simulated infrastructure with ephemeral state.</p>
            </div>
            <StatusBadge status="healthy" />
          </button>
          <button type="button" disabled aria-describedby="hosted-live-note">
            <span>
              <Wifi />
            </span>
            <div>
              <strong>Live Mode</strong>
              <p>Available only when HomeLab Commander runs on your own LAN.</p>
            </div>
            <StatusBadge status="unknown" />
          </button>
        </div>
        <div className="settings-note" id="hosted-live-note">
          <ShieldCheck />
          <p>
            Vercel cannot—and should not—reach your private network. Clone the
            project and run it locally to enable approved-range discovery,
            diagnostics, imports, and read-only Docker inventory.
          </p>
        </div>
        <div className="form-actions">
          <a
            className="button button-secondary button-default"
            href="https://github.com/chadkraus87/home-lab-commander#run-locally"
            target="_blank"
            rel="noreferrer"
          >
            Local setup guide
          </a>
        </div>
      </SettingsCard>
    );
  return (
    <SettingsCard
      title="Environment"
      description="Demo Mode and guided activation for owned local networks."
      icon={<Radar />}
    >
      <div className="mode-cards">
        <button
          type="button"
          aria-pressed={snapshot.settings.mode === "demo" && !activationOpen}
          className={
            snapshot.settings.mode === "demo" && !activationOpen ? "active" : ""
          }
          onClick={async () => {
            const saved = await updateSettings(
              mutate,
              snapshot.settings,
              { mode: "demo" },
              "Demo Mode activated",
            );
            if (saved) {
              setActivationOpen(false);
              setStep(1);
              setResults([]);
              setScanError("");
            }
          }}
        >
          <span>
            <Play />
          </span>
          <div>
            <strong>Demo Mode</strong>
            <p>Deterministic simulated infrastructure. No network access.</p>
          </div>
          <StatusBadge
            status={snapshot.settings.mode === "demo" ? "healthy" : "unknown"}
          />
        </button>
        <button
          type="button"
          aria-pressed={snapshot.settings.mode === "live" || activationOpen}
          className={
            snapshot.settings.mode === "live" || activationOpen ? "active" : ""
          }
          onClick={() => {
            setActivationOpen(true);
            setStep(1);
            setResults([]);
            setScanError("");
          }}
        >
          <span>
            <Wifi />
          </span>
          <div>
            <strong>Live Mode</strong>
            <p>Approved local ranges and optional Docker integration.</p>
          </div>
          <StatusBadge
            status={
              snapshot.settings.mode === "live"
                ? "healthy"
                : activationOpen
                  ? "degraded"
                  : "unknown"
            }
          />
        </button>
      </div>
      {!activationOpen ? (
        <div className="settings-note" role="status">
          <ShieldCheck />
          <p>
            {snapshot.settings.mode === "live"
              ? "Live Mode is active. Select the Live Mode card to run another bounded discovery."
              : "Demo Mode is active. Select Live Mode to begin the four-step safety review. No network operation runs until you explicitly start discovery in step 3."}
          </p>
        </div>
      ) : (
        <div className="onboarding" aria-label="Live Mode activation setup">
          <header>
            <div>
              <Badge tone="info">Activation setup selected</Badge>
              <Badge tone="neutral">Step {step} of 4</Badge>
              <strong>
                {step === 1
                  ? "Choose an approved network"
                  : step === 2
                    ? "Review exactly what will happen"
                    : step === 3
                      ? "Run bounded discovery"
                      : "Review discovered devices"}
              </strong>
            </div>
            <div className="step-dots">
              {[1, 2, 3, 4].map((item) => (
                <i key={item} className={item <= step ? "active" : ""} />
              ))}
            </div>
          </header>
          {step === 1 ? (
            <div className="onboarding-body">
              <Field label="Approved private network">
                <select
                  value={cidr}
                  onChange={(event) => setCidr(event.target.value)}
                >
                  {snapshot.settings.approvedCidrs.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Discovery method">
                <select
                  value={method}
                  onChange={(event) =>
                    setMethod(event.target.value as "passive" | "ping")
                  }
                >
                  <option value="passive">
                    Passive neighbor table (recommended)
                  </option>
                  <option value="ping">Rate-limited ping sweep</option>
                </select>
              </Field>
              <p>
                Need a different range? Add and approve it in the Networks
                section first.
              </p>
              <Button onClick={() => setStep(2)}>Review discovery plan</Button>
            </div>
          ) : step === 2 ? (
            <div className="onboarding-body review-plan">
              <ShieldCheck />
              <div>
                <h3>Discovery boundary</h3>
                <p>
                  <strong>Range:</strong> {cidr}
                </p>
                <p>
                  <strong>Method:</strong>{" "}
                  {method === "passive"
                    ? "Read the local ARP/neighbour table only"
                    : "At most 254 hosts, eight checks at a time, 1.5 second timeout"}
                </p>
                <p>
                  <strong>Not performed:</strong> port scanning, login attempts,
                  public-address scanning, exploitation, or configuration
                  changes.
                </p>
              </div>
              <div className="onboarding-actions">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)}>
                  I understand—continue
                </Button>
              </div>
            </div>
          ) : step === 3 ? (
            <div className="onboarding-body scan-ready">
              <Radar className={scanning ? "spin" : ""} />
              <h3>
                {scanning ? "Discovery in progress" : "Ready to discover"}
              </h3>
              <p>
                The selected operation begins only when you press the button
                below.
              </p>
              {scanError ? <p className="field-error">{scanError}</p> : null}
              <div className="onboarding-actions">
                <Button
                  variant="ghost"
                  onClick={() => setStep(2)}
                  disabled={scanning}
                >
                  Back
                </Button>
                <Button onClick={runDiscovery} disabled={scanning}>
                  {scanning ? "Checking local network…" : "Run discovery"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="onboarding-body">
              <div className="discovery-results">
                {results.map((result) => (
                  <label key={result.ip}>
                    <input
                      type="checkbox"
                      checked={selected.has(result.ip)}
                      onChange={(event) =>
                        setSelected((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(result.ip);
                          else next.delete(result.ip);
                          return next;
                        })
                      }
                    />
                    <span>
                      <strong>{result.hostname ?? result.ip}</strong>
                      <small>
                        {result.ip} · {result.macAddress ?? "MAC unavailable"} ·{" "}
                        {result.confidence} confidence
                      </small>
                    </span>
                    <StatusBadge
                      status={
                        result.status === "reachable" ? "healthy" : "unknown"
                      }
                    />
                  </label>
                ))}
                {results.length === 0 ? (
                  <div className="empty-discovery">
                    <Network />
                    <strong>No neighbors observed</strong>
                    <p>
                      Nothing is broken. The approved network may be empty, or
                      passive discovery may not have enough local information
                      yet.
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="onboarding-actions">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Start over
                </Button>
                <Button disabled={busy} onClick={promoteAndActivate}>
                  {results.length
                    ? `Add ${selected.size} and activate Live Mode`
                    : "Activate Live Mode without devices"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </SettingsCard>
  );
}

function NetworkSettings() {
  const { snapshot, mutate, busy } = useApp();
  const [cidrs, setCidrs] = useState(
    snapshot.settings.approvedCidrs.join("\n"),
  );
  return (
    <SettingsCard
      title="Approved networks"
      description="Discovery rejects any target outside this private-range allowlist."
      icon={<Network />}
    >
      <Field
        label="One private CIDR per line"
        hint="Ranges broader than /24 can be approved, but each discovery run is limited to a /24."
      >
        <textarea
          rows={7}
          value={cidrs}
          onChange={(event) => setCidrs(event.target.value)}
        />
      </Field>
      <div className="settings-note">
        <ShieldCheck />
        <p>
          RFC1918 ranges only. Public networks are rejected server-side even if
          entered here.
        </p>
      </div>
      <div className="form-actions">
        <Button
          disabled={busy}
          onClick={() =>
            updateSettings(
              mutate,
              snapshot.settings,
              {
                approvedCidrs: cidrs
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean),
              },
              "Approved networks updated",
            )
          }
        >
          <Save size={14} />
          Save allowlist
        </Button>
      </div>
    </SettingsCard>
  );
}

function MonitoringSettings() {
  const { snapshot, mutate, busy } = useApp();
  const [days, setDays] = useState(snapshot.settings.retentionDays);
  return (
    <SettingsCard
      title="Monitoring"
      description="Collection intervals, retention, and local storage policy."
      icon={<Activity />}
    >
      <div className="setting-row">
        <div>
          <strong>Metric retention</strong>
          <p>
            Raw samples older than this window are eligible for aggregation and
            removal.
          </p>
        </div>
        <select
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
        >
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="365">1 year</option>
        </select>
      </div>
      <div className="setting-row">
        <div>
          <strong>Alert deduplication</strong>
          <p>
            One active alert per fingerprint; repeated observations update last
            seen.
          </p>
        </div>
        <Badge tone="positive">Enabled</Badge>
      </div>
      <div className="setting-row">
        <div>
          <strong>Demo telemetry interval</strong>
          <p>Current simulated collector cadence.</p>
        </div>
        <span>{snapshot.settings.refreshSeconds} seconds</span>
      </div>
      <div className="form-actions">
        <Button
          disabled={busy}
          onClick={() =>
            updateSettings(
              mutate,
              snapshot.settings,
              { retentionDays: days },
              "Monitoring settings saved",
            )
          }
        >
          <Save size={14} />
          Save monitoring
        </Button>
      </div>
    </SettingsCard>
  );
}

function DockerSettings() {
  const { snapshot } = useApp();
  const [state, setState] = useState<{
    available: boolean;
    message: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  async function check() {
    setBusy(true);
    try {
      const response = await fetch("/api/docker");
      setState(
        (await response.json()) as { available: boolean; message: string },
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <SettingsCard
      title="Docker"
      description="Optional local CLI provider with a read-only default."
      icon={<Box />}
    >
      <div className="integration-card">
        <span>
          <Box />
        </span>
        <div>
          <strong>Local Docker daemon</strong>
          <p>
            {snapshot.hostedDemo
              ? "Unavailable in the hosted showcase. Run locally to connect."
              : (state?.message ?? "Not checked during this session.")}
          </p>
        </div>
        <StatusBadge
          status={state?.available ? "healthy" : state ? "offline" : "unknown"}
        />
      </div>
      <div className="settings-note">
        <ShieldCheck />
        <p>
          HomeLab Commander runs only fixed read-only Docker arguments. Start,
          stop, and restart require a future explicit confirmation workflow and
          are not enabled.
        </p>
      </div>
      <div className="form-actions">
        <Button
          variant="secondary"
          disabled={busy || snapshot.hostedDemo}
          onClick={check}
          title={
            snapshot.hostedDemo ? "Docker integration is local-only" : undefined
          }
        >
          <RefreshCw size={14} className={busy ? "spin" : ""} />
          {busy ? "Checking…" : "Check connection"}
        </Button>
      </div>
    </SettingsCard>
  );
}

function AppearanceSettings() {
  const { snapshot, mutate } = useApp();
  const { setTheme } = useTheme();
  async function changeTheme(theme: AppSettings["theme"]) {
    setTheme(theme);
    await updateSettings(
      mutate,
      snapshot.settings,
      { theme },
      "Appearance updated",
    );
  }
  return (
    <SettingsCard
      title="Appearance"
      description="Theme and information density for this browser."
      icon={<Palette />}
    >
      <div className="theme-options">
        {(["dark", "light", "system"] as const).map((theme) => (
          <button
            key={theme}
            className={snapshot.settings.theme === theme ? "active" : ""}
            onClick={() => changeTheme(theme)}
          >
            <span className={`theme-preview ${theme}`}>
              <i />
              <i />
              <i />
            </span>
            <strong>
              {theme[0]?.toUpperCase()}
              {theme.slice(1)}
            </strong>
          </button>
        ))}
      </div>
      <div className="setting-row">
        <div>
          <strong>Interface density</strong>
          <p>Comfortable is optimized for mixed desktop and tablet use.</p>
        </div>
        <SegmentedControl
          label="Interface density"
          value={snapshot.settings.density}
          onChange={(density) =>
            updateSettings(
              mutate,
              snapshot.settings,
              { density },
              "Density updated",
            )
          }
          options={[
            { value: "comfortable", label: "Comfortable" },
            { value: "compact", label: "Compact" },
          ]}
        />
      </div>
    </SettingsCard>
  );
}

function DataSettings() {
  const { snapshot, mutate, replaceSnapshot, busy } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  async function importFile(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      window.alert("That backup is larger than the 2 MB safety limit.");
      return;
    }
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      window.alert("That file is not valid JSON.");
      return;
    }
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    const body = (await response.json()) as AppSnapshot | { error: string };
    if (!response.ok || "error" in body) {
      window.alert("error" in body ? body.error : "Import failed");
      return;
    }
    replaceSnapshot(body);
  }
  function exportHostedSession() {
    const body = JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          devices: snapshot.devices,
          services: snapshot.services,
          inventory: snapshot.inventory,
          notes: snapshot.notes,
          settings: snapshot.settings,
        },
      },
      null,
      2,
    );
    const url = URL.createObjectURL(
      new Blob([body], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `homelab-commander-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function reset() {
    if (
      !window.confirm(
        "Reset the Demo Environment? Manual records will be replaced by the original simulated lab.",
      )
    )
      return;
    await mutate({ action: "reset-demo" }, "Demo Environment reset");
  }
  return (
    <SettingsCard
      title="Data"
      description="Portable local backup, validated import, and recoverable Demo reset."
      icon={<Database />}
    >
      <div className="data-actions">
        <div>
          <span>
            <Download />
          </span>
          <div>
            <strong>Export portable backup</strong>
            <p>Devices, services, inventory, notes, and non-secret settings.</p>
          </div>
          {snapshot.hostedDemo ? (
            <Button variant="secondary" onClick={exportHostedSession}>
              Export this tab
            </Button>
          ) : (
            <a
              className="button button-secondary button-default"
              href="/api/export"
              download
            >
              Export JSON
            </a>
          )}
        </div>
        <div>
          <span>
            <Upload />
          </span>
          <div>
            <strong>Import backup</strong>
            <p>
              Fully validated before replacing matching local data. Imports
              always return to Demo Mode for a fresh safety review.
            </p>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importFile(file);
            }}
          />
          <Button
            variant="secondary"
            disabled={snapshot.hostedDemo}
            onClick={() => fileInput.current?.click()}
            title={
              snapshot.hostedDemo
                ? "Imports are disabled in the public showcase"
                : undefined
            }
          >
            {snapshot.hostedDemo ? "Local-only" : "Choose file"}
          </Button>
        </div>
        <div className="danger-zone">
          <span>
            <RotateCcw />
          </span>
          <div>
            <strong>Reset Demo Environment</strong>
            <p>
              Restores the original deterministic lab, alerts, events,
              inventory, and notes.
            </p>
          </div>
          <Button variant="danger" disabled={busy} onClick={reset}>
            Reset demo
          </Button>
        </div>
      </div>
    </SettingsCard>
  );
}

function AboutSettings() {
  return (
    <SettingsCard
      title="About"
      description="Build and security information."
      icon={<Info />}
    >
      <div className="about-product">
        <div className="brand-mark">
          <MonitorCog />
        </div>
        <div>
          <h2>HomeLab Commander</h2>
          <p>Your infrastructure. One command center.</p>
          <Badge tone="info">Version 0.1.0</Badge>
        </div>
      </div>
      <dl className="detail-list">
        <div>
          <dt>Runtime</dt>
          <dd>Next.js 16 · Node.js 24</dd>
        </div>
        <div>
          <dt>Database</dt>
          <dd>Local SQLite</dd>
        </div>
        <div>
          <dt>Default binding</dt>
          <dd className="mono">127.0.0.1:3000</dd>
        </div>
        <div>
          <dt>Security model</dt>
          <dd>Private-network allowlist · read-only defaults</dd>
        </div>
        <div>
          <dt>License</dt>
          <dd>MIT</dd>
        </div>
      </dl>
    </SettingsCard>
  );
}

function SettingsCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="settings-card">
      <header>
        <span>{icon}</span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      <div className="settings-card-body">{children}</div>
    </Card>
  );
}

async function updateSettings(
  mutate: ReturnType<typeof useApp>["mutate"],
  current: AppSettings,
  patch: Partial<AppSettings>,
  message: string,
) {
  return mutate(
    { action: "update-settings", data: { ...current, ...patch } },
    message,
  );
}

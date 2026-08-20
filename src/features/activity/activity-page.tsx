"use client";

import { useMemo, useState } from "react";
import { Activity, CalendarClock, Filter, Search } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Badge, Card, PageHeader, StatusBadge } from "@/components/ui";
import { formatRelativeTime, titleCase } from "@/lib/utils";

export function ActivityPage() {
  const { snapshot } = useApp();
  const [query, setQuery] = useState("");
  const [device, setDevice] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [source, setSource] = useState("all");
  const [range, setRange] = useState("24h");
  const events = useMemo(
    () =>
      snapshot.events.filter((event) => {
        const age =
          Date.parse(snapshot.generatedAt) - Date.parse(event.timestamp);
        const rangeMs =
          range === "1h"
            ? 3_600_000
            : range === "6h"
              ? 21_600_000
              : range === "7d"
                ? 604_800_000
                : 86_400_000;
        return (
          age <= rangeMs &&
          (device === "all" || event.deviceId === device) &&
          (severity === "all" || event.severity === severity) &&
          (source === "all" || event.source === source) &&
          `${event.message} ${event.eventType}`
            .toLowerCase()
            .includes(query.toLowerCase())
        );
      }),
    [
      snapshot.events,
      snapshot.generatedAt,
      query,
      device,
      severity,
      source,
      range,
    ],
  );
  const grouped = groupEvents(events);
  return (
    <>
      <PageHeader
        eyebrow="Evidence stream"
        title="Activity"
        description="Chronological infrastructure events with source, severity, and device context."
        actions={
          <Badge tone="info">
            <Activity size={12} />
            {events.length} events in range
          </Badge>
        }
      />
      <Card>
        <div className="activity-filters">
          <div className="input-wrap">
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search event messages…"
              aria-label="Search activity"
            />
          </div>
          <select
            value={device}
            onChange={(event) => setDevice(event.target.value)}
          >
            <option value="all">All devices</option>
            {snapshot.devices.map((item) => (
              <option value={item.id} key={item.id}>
                {item.displayName}
              </option>
            ))}
          </select>
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="all">All sources</option>
            {[...new Set(snapshot.events.map((event) => event.source))].map(
              (item) => (
                <option key={item}>{item}</option>
              ),
            )}
          </select>
          <select
            value={range}
            onChange={(event) => setRange(event.target.value)}
          >
            <option value="1h">Last hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
        </div>
        <div className="activity-stream">
          {Object.entries(grouped).map(([day, dayEvents]) => (
            <section key={day}>
              <header>
                <CalendarClock size={14} />
                <strong>{day}</strong>
                <span>{dayEvents.length} events</span>
              </header>
              {dayEvents.map((event) => {
                const linkedDevice = snapshot.devices.find(
                  (item) => item.id === event.deviceId,
                );
                return (
                  <article className="activity-event" key={event.id}>
                    <time>
                      {new Date(event.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </time>
                    <span className={`timeline-dot ${event.severity}`} />
                    <div>
                      <strong>{event.message}</strong>
                      <footer>
                        <StatusBadge status={event.severity} />
                        <span>{titleCase(event.eventType)}</span>
                        <i>•</i>
                        <span>{event.source}</span>
                        {linkedDevice ? (
                          <>
                            <i>•</i>
                            <span>{linkedDevice.displayName}</span>
                          </>
                        ) : null}
                        <i>•</i>
                        <span>{formatRelativeTime(event.timestamp)}</span>
                      </footer>
                    </div>
                  </article>
                );
              })}
            </section>
          ))}
          {events.length === 0 ? (
            <div className="empty-state">
              <Filter />
              <h3>No matching events</h3>
              <p>Widen the time range or clear one of the filters.</p>
            </div>
          ) : null}
        </div>
        <footer className="list-footer">
          <span>Newest events first</span>
          <span>Demo activity is marked by its source</span>
        </footer>
      </Card>
    </>
  );
}

function groupEvents(events: ReturnType<typeof useApp>["snapshot"]["events"]) {
  return events.reduce<Record<string, typeof events>>((groups, event) => {
    const date = new Date(event.timestamp);
    const today = new Date();
    const label =
      date.toDateString() === today.toDateString()
        ? "Today"
        : date.toLocaleDateString([], {
            weekday: "long",
            month: "short",
            day: "numeric",
          });
    groups[label] = [...(groups[label] ?? []), event];
    return groups;
  }, {});
}

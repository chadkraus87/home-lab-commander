import type { MaintenanceWindow } from "@/domain/types";

export type MaintenanceWindowState = "upcoming" | "active" | "completed";

export function maintenanceWindowState(
  window: MaintenanceWindow,
  now = new Date(),
): MaintenanceWindowState {
  const current = now.getTime();
  if (current < Date.parse(window.startsAt)) return "upcoming";
  if (current < Date.parse(window.endsAt)) return "active";
  return "completed";
}

export function getActiveMaintenanceWindow(
  windows: MaintenanceWindow[],
  now = new Date(),
): MaintenanceWindow | null {
  return (
    windows
      .filter((window) => maintenanceWindowState(window, now) === "active")
      .toSorted((left, right) => left.endsAt.localeCompare(right.endsAt))[0] ??
    null
  );
}

export function sortMaintenanceWindows(
  windows: MaintenanceWindow[],
  now = new Date(),
): MaintenanceWindow[] {
  const rank: Record<MaintenanceWindowState, number> = {
    active: 0,
    upcoming: 1,
    completed: 2,
  };
  return windows.toSorted((left, right) => {
    const stateDifference =
      rank[maintenanceWindowState(left, now)] -
      rank[maintenanceWindowState(right, now)];
    if (stateDifference !== 0) return stateDifference;
    if (maintenanceWindowState(left, now) === "completed")
      return right.endsAt.localeCompare(left.endsAt);
    return left.startsAt.localeCompare(right.startsAt);
  });
}

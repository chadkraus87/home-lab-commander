import type { Instrumentation } from "next";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  writeLog("info", "application.started", {
    deployment:
      process.env.HOMELAB_HOSTED_DEMO === "1" || process.env.VERCEL === "1"
        ? "hosted-demo"
        : "local",
    version: process.env.npm_package_version ?? "unknown",
  });
  if (
    process.env.HOMELAB_HOSTED_DEMO !== "1" &&
    process.env.VERCEL !== "1" &&
    process.env.HOMELAB_COLLECTOR_ENABLED === "1"
  ) {
    const { startCollector } = await import("@/server/collector");
    startCollector();
  }
}

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest)
      : null;
  writeLog("error", "request.unhandled_error", {
    method: request.method,
    path: request.path.split("?", 1)[0] ?? "unknown",
    route: context.routePath,
    routeType: context.routeType,
    errorType: error instanceof Error ? error.name : typeof error,
    digest,
  });
};

function writeLog(
  level: "info" | "error",
  event: string,
  context: Record<string, string | null>,
): void {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  });
  if (level === "error") console.error(record);
  else console.log(record);
}

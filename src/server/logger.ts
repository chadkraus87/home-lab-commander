import "server-only";

type LogLevel = "debug" | "info" | "warn" | "error";

export function log(
  level: LogLevel,
  event: string,
  context: Record<string, string | number | boolean | null> = {},
): void {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  });
  const stream =
    level === "error" || level === "warn" ? process.stderr : process.stdout;
  stream.write(`${record}\n`);
}

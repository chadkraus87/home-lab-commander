import { createDatabaseBackup } from "./lib/database-backup.mjs";

const intervalHours = readInterval(process.env.HOMELAB_BACKUP_INTERVAL_HOURS);
let stopping = false;

process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});

while (!stopping) {
  try {
    const result = await createDatabaseBackup();
    log("info", "database.backup.completed", {
      output: result.outputPath,
      expiredBackupsRemoved: result.removed.length,
    });
  } catch (error) {
    log("error", "database.backup.failed", {
      message: error instanceof Error ? error.message : "Unknown backup error",
    });
  }
  await wait(intervalHours * 60 * 60 * 1_000);
}

function readInterval(value) {
  const parsed = Number(value ?? "24");
  if (!Number.isFinite(parsed) || parsed < 0.25 || parsed > 168)
    throw new Error("Backup interval must be from 0.25 through 168 hours.");
  return parsed;
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      process.off("SIGINT", finish);
      process.off("SIGTERM", finish);
      resolve();
    }, milliseconds);
    const finish = () => {
      clearTimeout(timeout);
      process.off("SIGINT", finish);
      process.off("SIGTERM", finish);
      resolve();
    };
    process.once("SIGINT", finish);
    process.once("SIGTERM", finish);
  });
}

function log(level, event, details) {
  process.stdout.write(
    `${JSON.stringify({
      level,
      event,
      timestamp: new Date().toISOString(),
      ...details,
    })}\n`,
  );
}

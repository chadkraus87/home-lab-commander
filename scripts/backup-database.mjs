import { createDatabaseBackup } from "./lib/database-backup.mjs";

try {
  const result = await createDatabaseBackup();
  process.stdout.write(
    `${JSON.stringify({
      level: "info",
      event: "database.backup.completed",
      output: result.outputPath,
      expiredBackupsRemoved: result.removed.length,
    })}\n`,
  );
} catch (error) {
  process.stderr.write(
    `${JSON.stringify({
      level: "error",
      event: "database.backup.failed",
      message: error instanceof Error ? error.message : "Unknown backup error",
    })}\n`,
  );
  process.exitCode = 1;
}

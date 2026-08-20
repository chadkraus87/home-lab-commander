import { verifyDatabase } from "./lib/database-backup.mjs";

const path = process.argv[2];
if (!path) {
  process.stderr.write("Usage: npm run backup:verify -- /path/to/backup.db\n");
  process.exitCode = 1;
} else {
  try {
    verifyDatabase(path);
    process.stdout.write(
      `${JSON.stringify({
        level: "info",
        event: "database.backup.verified",
        path,
      })}\n`,
    );
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        level: "error",
        event: "database.backup.invalid",
        message:
          error instanceof Error ? error.message : "Unknown verification error",
      })}\n`,
    );
    process.exitCode = 1;
  }
}

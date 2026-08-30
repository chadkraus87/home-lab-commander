import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { verifyDatabase } from "./lib/database-backup.mjs";

const input = process.argv[2];
if (!input) {
  process.stderr.write("Usage: npm run restore:drill -- /path/to/backup.db\n");
  process.exitCode = 1;
} else {
  const directory = await mkdtemp(join(tmpdir(), "homelab-restore-drill-"));
  const copy = join(directory, basename(input));
  try {
    await copyFile(resolve(input), copy);
    verifyDatabase(copy);
    const database = new DatabaseSync(copy, { readOnly: true });
    const tables = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all()
      .map((row) => String(row.name));
    database.close();
    const required = [
      "application_settings",
      "devices",
      "services",
      "schema_migrations",
    ];
    if (required.some((table) => !tables.includes(table)))
      throw new Error(
        "Backup is valid SQLite but is missing required HomeLab Commander tables.",
      );
    process.stdout.write(
      `${JSON.stringify({ level: "info", event: "database.restore_drill.passed", source: resolve(input), tableCount: tables.length })}\n`,
    );
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({ level: "error", event: "database.restore_drill.failed", message: error instanceof Error ? error.message : "Unknown restore-drill error" })}\n`,
    );
    process.exitCode = 1;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

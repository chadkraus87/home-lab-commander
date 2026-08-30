import { access, chmod, copyFile, rename, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  createDatabaseBackup,
  verifyDatabase,
} from "./lib/database-backup.mjs";

const input = process.argv[2];
const confirmed =
  process.argv.includes("--apply") &&
  process.argv.includes("--confirm=REPLACE_LOCAL_DATABASE");
const target = resolve(
  process.env.HOMELAB_DATABASE_PATH ?? "./data/homelab.db",
);

if (!input || !confirmed) {
  process.stderr.write(
    "Offline restore only. Stop the app, then run:\n  npm run restore -- /path/to/backup.db --apply --confirm=REPLACE_LOCAL_DATABASE\n",
  );
  process.exitCode = 1;
} else {
  const source = resolve(input);
  const temporary = `${target}.restore-${process.pid}.tmp`;
  try {
    await access(target);
    verifyDatabase(source);
    const live = new DatabaseSync(target, { timeout: 250 });
    try {
      live.exec("BEGIN IMMEDIATE; ROLLBACK;");
    } catch {
      throw new Error(
        "The live database is busy. Stop HomeLab Commander before restoring.",
      );
    } finally {
      live.close();
    }
    const safety = await createDatabaseBackup({
      sourcePath: target,
      destinationDirectory: resolve(dirname(target), "../backups"),
      retention: 30,
    });
    await copyFile(source, temporary);
    await chmod(temporary, 0o600);
    verifyDatabase(temporary);
    await rename(temporary, target);
    await Promise.allSettled([
      unlink(`${target}-wal`),
      unlink(`${target}-shm`),
    ]);
    verifyDatabase(target);
    process.stdout.write(
      `${JSON.stringify({ level: "info", event: "database.restore.completed", source, target, preRestoreBackup: safety.outputPath })}\n`,
    );
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    process.stderr.write(
      `${JSON.stringify({ level: "error", event: "database.restore.failed", message: error instanceof Error ? error.message : "Unknown restore error" })}\n`,
    );
    process.exitCode = 1;
  }
}

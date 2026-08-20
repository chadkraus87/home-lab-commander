import { mkdir, readdir, stat, unlink, chmod } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";

const backupFilePattern = /^homelab-\d{8}T\d{6}\.\d{3}Z\.db$/;

export async function createDatabaseBackup({
  sourcePath = process.env.HOMELAB_DATABASE_PATH ?? "./data/homelab.db",
  destinationDirectory = process.env.HOMELAB_BACKUP_DIRECTORY ?? "./backups",
  retention = readPositiveInteger(process.env.HOMELAB_BACKUP_RETENTION, 14),
  now = new Date(),
} = {}) {
  const source = resolve(sourcePath);
  const destination = resolve(destinationDirectory);
  const sourceInfo = await stat(source);
  if (!sourceInfo.isFile())
    throw new Error("The configured database is not a file.");

  await mkdir(destination, { recursive: true, mode: 0o700 });
  const timestamp = now.toISOString().replaceAll(":", "").replaceAll("-", "");
  const outputPath = join(destination, `homelab-${timestamp}.db`);
  const database = new DatabaseSync(source, { readOnly: true });
  try {
    await backup(database, outputPath);
  } finally {
    database.close();
  }
  normalizeBackup(outputPath);
  await chmod(outputPath, 0o600);
  verifyDatabase(outputPath);
  const removed = await enforceRetention(destination, retention);
  return { source, outputPath, removed };
}

export function verifyDatabase(path) {
  const database = new DatabaseSync(resolve(path), { readOnly: true });
  try {
    const row = database.prepare("PRAGMA integrity_check").get();
    if (!row || row.integrity_check !== "ok")
      throw new Error("SQLite integrity verification failed.");
  } finally {
    database.close();
  }
}

function normalizeBackup(path) {
  const database = new DatabaseSync(resolve(path));
  try {
    database.exec("PRAGMA journal_mode=DELETE");
    const row = database.prepare("PRAGMA integrity_check").get();
    if (!row || row.integrity_check !== "ok")
      throw new Error("SQLite integrity verification failed.");
  } finally {
    database.close();
  }
}

async function enforceRetention(directory, retention) {
  const candidates = (await readdir(directory, { withFileTypes: true }))
    .filter(
      (entry) => entry.isFile() && backupFilePattern.test(basename(entry.name)),
    )
    .map((entry) => entry.name)
    .sort()
    .reverse();
  const expired = candidates.slice(retention);
  for (const filename of expired) await unlink(join(directory, filename));
  return expired;
}

function readPositiveInteger(value, fallback) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 365)
    throw new Error("Backup retention must be an integer from 1 through 365.");
  return parsed;
}

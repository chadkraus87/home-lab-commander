import "server-only";

import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export function openDatabase(databasePath: string): DatabaseSync {
  const absolutePath = isAbsolute(databasePath)
    ? databasePath
    : resolve(databasePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  const database = new DatabaseSync(absolutePath, { timeout: 5_000 });
  database.exec(
    "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;",
  );
  migrate(database);
  return database;
}

function migrate(database: DatabaseSync): void {
  const migrationDirectory = join(process.cwd(), "migrations");
  const files = readdirSync(migrationDirectory)
    .filter((file) => /^\d+.*\.sql$/.test(file))
    .sort();
  database.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
  for (const file of files) {
    const version = Number(file.match(/^\d+/)?.[0]);
    if (
      database
        .prepare("SELECT 1 FROM schema_migrations WHERE version = ?")
        .get(version)
    )
      continue;
    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(readFileSync(join(migrationDirectory, file), "utf8"));
      database
        .prepare(
          "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
        )
        .run(version, new Date().toISOString());
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
}


import * as SQLite from 'expo-sqlite';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = initializeDatabase();
  }

  return databasePromise;
}

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('realms.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  await migrateCharacterClassLevels(db);

  return db;
}

/**
 * Migrates legacy single-class character data to classLevels.
 *
 * Legacy:
 * {
 *   characterClass: "Wizard",
 *   subClass: "School of Evocation",
 *   level: 3
 * }
 *
 * New:
 * {
 *   classLevels: [
 *     {
 *       characterClass: "Wizard",
 *       subClass: "School of Evocation",
 *       level: 3
 *     }
 *   ]
 * }
 */
async function migrateCharacterClassLevels(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  const rows = await db.getAllAsync<{
    id: string;
    data_json: string;
  }>(`
    SELECT id, data_json
    FROM characters
  `);

  for (const row of rows) {
    let data: Record<string, any>;

    try {
      data = JSON.parse(row.data_json);
    } catch {
      // Do not overwrite records that cannot be parsed.
      console.warn(
        `Skipping character migration: invalid JSON for ${row.id}`,
      );
      continue;
    }

    // Already migrated: leave the character untouched.
    if (
      Array.isArray(data.classLevels) &&
      data.classLevels.length > 0
    ) {
      continue;
    }

    // Only migrate records that actually have the legacy class fields.
    if (
      typeof data.characterClass !== 'string' ||
      data.characterClass.trim().length === 0
    ) {
      continue;
    }

    const parsedLevel = Number(data.level);
    const level =
      Number.isInteger(parsedLevel) && parsedLevel >= 1
        ? parsedLevel
        : 1;

    data.classLevels = [
      {
        characterClass: data.characterClass,
        subClass:
          typeof data.subClass === 'string'
            ? data.subClass
            : '',
        level,
      },
    ];

    // Preserve all other data. Remove the legacy fields so classLevels
    // becomes the sole source of class and level information.
    delete data.characterClass;
    delete data.subClass;
    delete data.level;

    await db.runAsync(
      `UPDATE characters
       SET data_json = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      JSON.stringify(data),
      row.id,
    );
  }
}

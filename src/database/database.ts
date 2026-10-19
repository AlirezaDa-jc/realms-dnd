
import Constants from 'expo-constants';
import * as SQLite from 'expo-sqlite';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

const CURRENT_APP_VERSION =
  Constants.expoConfig?.version ?? '1.1.0';

/**
 * Each migration has its own threshold.
 *
 * A migration runs if:
 * - its version record is missing;
 * - its stored version is invalid; or
 * - the stored version is <= its threshold.
 *
 * Increase the threshold when you need that migration to run again.
 */
const MIGRATIONS = [
  {
    id: 'character_dm_fields',
    run: migrateCharacterDMFields,
  },
  {
    id: 'character_class_levels',
    run: migrateCharacterClassLevels,
  },
  {
    id: 'character_unarmed_strike',
    run: migrateCharacterUnarmedStrike,
  },
] as const;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = initializeDatabase().catch((error) => {
      databasePromise = null;
      throw error;
    });
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
        category TEXT NOT NULL DEFAULT '',
        challenge_rating REAL DEFAULT NULL,
        encounter_role TEXT NOT NULL DEFAULT '',
        party INTEGER NOT NULL DEFAULT 0 CHECK (party IN (0, 1)),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS combats (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
            CHECK (status IN ('active', 'finished')),
        outcome TEXT DEFAULT NULL,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS migration_status (
        key TEXT PRIMARY KEY NOT NULL,
        value INTEGER NOT NULL DEFAULT 0 CHECK (value IN (0, 1))
    );
`);


  await db.withTransactionAsync(async () => {
    for (const migration of MIGRATIONS) {
      const status = await db.getFirstAsync<{ value: number }>(
        `SELECT value
             FROM migration_status
             WHERE key = ?`,
        migration.id,
      );

      // Skip migrations that have already completed.
      if (status?.value === 1) {
        continue;
      }

      // Run the migration.
      await migration.run(db);

      // Mark it completed only after it succeeds.
      await db.runAsync(
        `INSERT INTO migration_status (key, value)
             VALUES (?, 1)
             ON CONFLICT(key) DO UPDATE SET
                 value = excluded.value`,
        migration.id,
      );
    }
  });

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_characters_category
      ON characters(category);

    CREATE INDEX IF NOT EXISTS idx_characters_challenge_rating
      ON characters(challenge_rating);

    CREATE INDEX IF NOT EXISTS idx_characters_encounter_role
      ON characters(encounter_role);

    CREATE INDEX IF NOT EXISTS idx_characters_party
      ON characters(party);

    CREATE INDEX IF NOT EXISTS idx_combats_status
      ON combats(status);

    CREATE INDEX IF NOT EXISTS idx_combats_updated_at
      ON combats(updated_at);
  `);

  return db;
}

function isValidVersion(version: string): boolean {
  if (!/^\d+(\.\d+)*$/.test(version)) {
    return false;
  }

  return version.split('.').every((part) => {
    const value = Number(part);
    return Number.isSafeInteger(value);
  });
}

function compareVersions(a: string, b: string): number {
  if (!isValidVersion(a) || !isValidVersion(b)) {
    throw new Error(`Invalid version: ${a} or ${b}`);
  }

  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i++) {
    const x = left[i] ?? 0;
    const y = right[i] ?? 0;

    if (x < y) return -1;
    if (x > y) return 1;
  }

  return 0;
}

/**
 * Adds DM fields as independent SQLite columns and migrates
 * any existing values out of data_json.
 */
async function migrateCharacterDMFields(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(characters)',
  );

  const existingColumns = new Set(columns.map((column) => column.name));

  if (!existingColumns.has('category')) {
    await db.execAsync(`
      ALTER TABLE characters
      ADD COLUMN category TEXT NOT NULL DEFAULT '';
    `);
  }

  if (!existingColumns.has('challenge_rating')) {
    await db.execAsync(`
      ALTER TABLE characters
      ADD COLUMN challenge_rating REAL DEFAULT NULL;
    `);
  }

  if (!existingColumns.has('encounter_role')) {
    await db.execAsync(`
      ALTER TABLE characters
      ADD COLUMN encounter_role TEXT NOT NULL DEFAULT '';
    `);
  }

  if (!existingColumns.has('party')) {
    await db.execAsync(`
      ALTER TABLE characters
      ADD COLUMN party INTEGER NOT NULL DEFAULT 0;
    `);
  }

  const rows = await db.getAllAsync<{
    id: string;
    data_json: string;
  }>(`
    SELECT id, data_json
    FROM characters
  `);

  for (const row of rows) {
    let data: Record<string, unknown>;

    try {
      data = JSON.parse(row.data_json);
    } catch {
      console.warn(
        `Skipping DM field migration: invalid JSON for ${row.id}`,
      );
      continue;
    }

    const hasCategory = Object.hasOwn(data, 'category');
    const hasChallengeRating = Object.hasOwn(data, 'challengeRating');
    const hasEncounterRole = Object.hasOwn(data, 'encounterRole');
    const hasParty = Object.hasOwn(data, 'party');

    const category =
      typeof data.category === 'string' ? data.category.trim() : '';

    const challengeRating =
      typeof data.challengeRating === 'number' &&
        Number.isFinite(data.challengeRating) &&
        data.challengeRating >= 0
        ? data.challengeRating
        : null;

    const encounterRole =
      typeof data.encounterRole === 'string'
        ? data.encounterRole.trim()
        : '';

    const party = data.party === true ? 1 : 0;

    const hadDMFields =
      hasCategory ||
      hasChallengeRating ||
      hasEncounterRole ||
      hasParty;

    if (!hadDMFields) {
      continue;
    }

    await db.runAsync(
      `UPDATE characters
       SET
         category = CASE WHEN ? = 1 THEN ? ELSE category END,
         challenge_rating = CASE WHEN ? = 1 THEN ? ELSE challenge_rating END,
         encounter_role = CASE WHEN ? = 1 THEN ? ELSE encounter_role END,
         party = CASE WHEN ? = 1 THEN ? ELSE party END
       WHERE id = ?`,
      hasCategory ? 1 : 0,
      category,
      hasChallengeRating ? 1 : 0,
      challengeRating,
      hasEncounterRole ? 1 : 0,
      encounterRole,
      hasParty ? 1 : 0,
      party,
      row.id,
    );

    // DM fields are stored only in their dedicated columns.
    delete data.category;
    delete data.challengeRating;
    delete data.encounterRole;
    delete data.party;

    await db.runAsync(
      `UPDATE characters
       SET data_json = ?
       WHERE id = ?`,
      JSON.stringify(data),
      row.id,
    );
  }
}

/**
 * Migrates legacy single-class character data to classLevels.
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
      console.warn(
        `Skipping character migration: invalid JSON for ${row.id}`,
      );
      continue;
    }

    let changed = false;

    if (
      (!Array.isArray(data.classLevels) ||
        data.classLevels.length === 0) &&
      typeof data.characterClass === 'string' &&
      data.characterClass.trim().length > 0
    ) {
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

      delete data.characterClass;
      delete data.subClass;
      delete data.level;

      changed = true;
    }

    const firstClass = Array.isArray(data.classLevels)
      ? data.classLevels.find(
        (entry: any) =>
          typeof entry?.characterClass === 'string' &&
          entry.characterClass.trim().length > 0,
      )?.characterClass
      : undefined;

    const spells = data.spellbook?.spells;

    if (firstClass && Array.isArray(spells)) {
      for (const spell of spells) {
        if (
          spell &&
          typeof spell === 'object' &&
          !spell.sourceClass
        ) {
          spell.sourceClass = firstClass;
          changed = true;
        }
      }
    }

    if (changed) {
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
}
/**
 * Adds an Unarmed Strike to every character that does not
 * already have one.
 */
async function migrateCharacterUnarmedStrike(
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
      console.warn(
        `Skipping Unarmed Strike migration: invalid JSON for ${row.id}`,
      );
      continue;
    }

    const weapons = Array.isArray(data.weapons)
      ? data.weapons
      : [];

    const hasUnarmedStrike = weapons.some(
      (weapon: any) =>
        weapon &&
        typeof weapon === 'object' &&
        weapon.isUnarmed === true,
    );

    if (hasUnarmedStrike) {
      continue;
    }

    weapons.push({
      id: `weapon-unarmed-${row.id}`,
      name: 'Unarmed Strike',
      attackAbility: 'str',
      isProficient: true,
      damageAbility: 'str',
      damageDice: '1',
      damageType: 'bludgeoning',
      statBonuses: [],
      isFinesse: false,
      isThrown: false,
      isBound: false,
      isUnarmed: true,
    });

    data.weapons = weapons;

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
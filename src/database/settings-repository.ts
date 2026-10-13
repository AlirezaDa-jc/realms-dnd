
import { getDatabase } from './database';

export async function saveSetting(
    key: string,
    value: string,
): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
        `INSERT INTO app_settings (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        key,
        value,
    );
}

export async function loadSetting(
    key: string,
): Promise<string | null> {
    const db = await getDatabase();

    const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM app_settings WHERE key = ?',
        key,
    );

    return row?.value ?? null;
}

import {
    Combat,
    type CombatData,
    type CombatHistoryEntry,
    type CombatantSnapshot,
} from '@/models/combat';
import { characterFromJSON, characterToJSON } from './character-serializer';
import { getDatabase } from './database';

export type CombatSummary = {
    id: string;
    name: string;
    status: 'active' | 'finished';
    outcome: string | null;
    created_at: string;
    updated_at: string;
};

type StoredSnapshot = Omit<CombatantSnapshot, 'character'> & {
    character: Record<string, unknown>;
};

type StoredHistoryEntry = Omit<
    CombatHistoryEntry,
    'team1' | 'team2'
> & {
    team1: StoredSnapshot[];
    team2: StoredSnapshot[];
};

type StoredCombat = Omit<
    CombatData,
    'team1' | 'team2' | 'history'
> & {
    team1: StoredSnapshot[];
    team2: StoredSnapshot[];
    history: StoredHistoryEntry[];
};

function serializeSnapshots(
    snapshots: CombatantSnapshot[],
): StoredSnapshot[] {
    return snapshots.map(({ characterId, character }) => ({
        characterId,
        character: JSON.parse(
            characterToJSON(character),
        ) as Record<string, unknown>,
    }));
}

function deserializeSnapshots(
    snapshots: StoredSnapshot[],
): CombatantSnapshot[] {
    return snapshots.map(({ characterId, character }) => ({
        characterId,
        character: characterFromJSON(JSON.stringify(character)),
    }));
}

function serializeHistoryEntry(
    entry: CombatHistoryEntry,
): StoredHistoryEntry {
    return {
        ...entry,
        team1: serializeSnapshots(entry.team1),
        team2: serializeSnapshots(entry.team2),
    };
}

function deserializeHistoryEntry(
    entry: StoredHistoryEntry,
): CombatHistoryEntry {
    return {
        ...entry,
        team1: deserializeSnapshots(entry.team1),
        team2: deserializeSnapshots(entry.team2),
    };
}

function serializeCombat(combat: Combat): string {
    const stored: StoredCombat = {
        ...combat,
        team1: serializeSnapshots(combat.team1),
        team2: serializeSnapshots(combat.team2),
        history: combat.history.map(serializeHistoryEntry),
    };

    return JSON.stringify(stored);
}

function deserializeCombat(json: string): Combat {
    const stored = JSON.parse(json) as StoredCombat;

    return new Combat({
        ...stored,
        team1: deserializeSnapshots(stored.team1),
        team2: deserializeSnapshots(stored.team2),
        history: stored.history.map(deserializeHistoryEntry),
    });
}

/**
 * Insert a new combat or update an existing one.
 * The complete encounter and its full timeline are persisted.
 */
export async function saveCombat(
    combat: Combat,
): Promise<string> {
    const db = await getDatabase();

    await db.runAsync(
        `INSERT INTO combats (
            id,
            name,
            status,
            outcome,
            data_json
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            status = excluded.status,
            outcome = excluded.outcome,
            data_json = excluded.data_json,
            updated_at = CURRENT_TIMESTAMP`,
        combat.id,
        combat.name.trim() || 'Untitled Combat',
        combat.status,
        combat.outcome,
        serializeCombat(combat),
    );

    return combat.id;
}

/**
 * Load a combat and rehydrate every character snapshot
 * into a Character instance.
 */
export async function loadCombat(
    combatId: string,
): Promise<Combat> {
    const db = await getDatabase();

    const row = await db.getFirstAsync<{ data_json: string }>(
        `SELECT data_json
         FROM combats
         WHERE id = ?`,
        combatId,
    );

    if (!row) {
        throw new Error(`Combat not found: ${combatId}`);
    }

    return deserializeCombat(row.data_json);
}

/**
 * List lightweight summaries for the combat index.
 */
export async function listCombats(): Promise<CombatSummary[]> {
    const db = await getDatabase();

    return db.getAllAsync<CombatSummary>(
        `SELECT
            id,
            name,
            status,
            outcome,
            created_at,
            updated_at
         FROM combats
         ORDER BY
            CASE WHEN status = 'active' THEN 0 ELSE 1 END,
            updated_at DESC`,
    );
}

/**
 * Delete a combat record and its saved history.
 * This does not delete or modify any character records.
 */
export async function deleteCombat(
    combatId: string,
): Promise<void> {
    const db = await getDatabase();

    const result = await db.runAsync(
        'DELETE FROM combats WHERE id = ?',
        combatId,
    );

    if (result.changes === 0) {
        throw new Error(`Combat not found: ${combatId}`);
    }
}

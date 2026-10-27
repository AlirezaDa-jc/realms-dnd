import {
    Combat,
    type CombatData,
    type CombatantRef,
} from '@/models/combat';
import { getDatabase } from './database';

export type CombatSummary = {
    id: string;
    name: string;
    status: 'active' | 'finished';
    outcome: string | null;
    created_at: string;
    updated_at: string;
};

type LegacyCombatData = {
    id?: string;
    name?: string;
    status?: 'active' | 'finished';
    outcome?: CombatData['outcome'];
    team1?: Array<{ characterId?: string }>;
    team2?: Array<{ characterId?: string }>;
    createdAt?: string;
    startedAt?: string;
    finishedAt?: string | null;

    // Ignored when migrating old records.
    history?: unknown[];
};

function deserializeCombat(json: string): Combat {
    const stored = JSON.parse(json) as LegacyCombatData;

    const toRefs = (
        team: LegacyCombatData['team1'],
    ): CombatantRef[] =>
        (team ?? [])
            .filter(
                (
                    entry,
                ): entry is { characterId: string } =>
                    typeof entry?.characterId === 'string',
            )
            .map(({ characterId }) => ({ characterId }));

    return new Combat({
        id: stored.id,
        name: stored.name,
        status: stored.status,
        outcome: stored.outcome,
        team1: toRefs(stored.team1),
        team2: toRefs(stored.team2),
        createdAt: stored.createdAt,
        startedAt: stored.startedAt,
        finishedAt: stored.finishedAt,
    });
}

function serializeCombat(combat: Combat): string {
    // Explicitly serialize only the encounter fields.
    // No character copies and no history.
    const stored: CombatData = {
        id: combat.id,
        name: combat.name,
        status: combat.status,
        outcome: combat.outcome,
        team1: combat.team1.map(({ characterId }) => ({
            characterId,
        })),
        team2: combat.team2.map(({ characterId }) => ({
            characterId,
        })),
        createdAt: combat.createdAt,
        startedAt: combat.startedAt,
        finishedAt: combat.finishedAt,
    };

    return JSON.stringify(stored);
}

/**
 * Insert a new combat or update an existing one.
 * Only encounter metadata and team character IDs are persisted.
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
 * Load encounter metadata and team membership.
 * Character records must be loaded separately from the character repository.
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
 * Delete a combat record.
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
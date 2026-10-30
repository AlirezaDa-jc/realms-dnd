
import {
    Combat,
    type CombatData,
    type CombatantRef,
} from '@/models/combat';

const API_BASE_URL =
    process.env.EXPO_PUBLIC_REALMS_API_URL ?? 'https://realms-api-n6n1.onrender.com/api';

export type CombatSummary = {
    id: string;
    name: string;
    status: 'active' | 'finished';
    outcome: string | null;
    created_at: string;
    updated_at: string;
};

type CombatApiData = Partial<CombatData> & {
    id: string;
    team1?: Array<{ characterId?: string }>;
    team2?: Array<{ characterId?: string }>;
};

async function request<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
        const errorBody = body as
            | { error?: string; message?: string }
            | null;

        throw new Error(
            errorBody?.error ??
            errorBody?.message ??
            `API request failed (${response.status})`,
        );
    }

    return body as T;
}

/**
 * Accept either a direct combat object or a response wrapped
 * in { data: ... } or { combat: ... }.
 */
function unwrapCombat(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
        return body;
    }

    const result = body as Record<string, unknown>;

    if ('data' in result) {
        return result.data;
    }

    if ('combat' in result) {
        return result.combat;
    }

    return body;
}

function deserializeCombat(input: unknown): Combat {
    const value = unwrapCombat(input);

    if (!value || typeof value !== 'object') {
        throw new Error('The server returned invalid combat data.');
    }

    const stored = value as CombatApiData;

    if (typeof stored.id !== 'string') {
        throw new Error('The server response is missing the combat ID.');
    }

    const toRefs = (
        team: CombatApiData['team1'],
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

function serializeCombat(combat: Combat): CombatData {
    return {
        id: combat.id,
        name: combat.name.trim() || 'Untitled Combat',
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
}

export async function saveCombat(combat: Combat): Promise<string> {
    const payload = serializeCombat(combat);

    await request(`/combats/${encodeURIComponent(combat.id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });

    return combat.id;
}

export async function loadCombat(combatId: string): Promise<Combat> {
    const result = await request<unknown>(
        `/combats/${encodeURIComponent(combatId)}`,
    );

    return deserializeCombat(result);
}

export async function listCombats(): Promise<CombatSummary[]> {
    const result = await request<unknown>('/combats');
    const value =
        result &&
            typeof result === 'object' &&
            'data' in result
            ? (result as { data: unknown }).data
            : result;

    if (!Array.isArray(value)) {
        throw new Error('The server returned an invalid combat list.');
    }

    return value as CombatSummary[];
}

export async function deleteCombat(combatId: string): Promise<void> {
    await request(`/combats/${encodeURIComponent(combatId)}`, {
        method: 'DELETE',
    });
}

import { Character } from '@/models/character';
import * as Crypto from 'expo-crypto';
import { characterFromJSON, characterToJSON } from './character-serializer';
import { getDatabase } from './database';

export type CharacterSummary = {
    id: string;
    name: string;
    category: string;
    challenge_rating: number | null;
    encounter_role: string;
    party: number;
    created_at: string;
    updated_at: string;
};

export type CharacterFilters = {
    category?: string;
    encounterRole?: string;
    party?: boolean;
    minChallengeRating?: number;
    maxChallengeRating?: number;
};

export async function saveCharacter(
    character: Character,
    characterId?: string,
): Promise<string> {
    const db = await getDatabase();
    const id = characterId ?? character.id;

    character.id = id;
    character.validate();

    // Remove DM fields from the serialized model.
    const data = JSON.parse(
        characterToJSON(character),
    ) as Record<string, unknown>;

    delete data.category;
    delete data.challengeRating;
    delete data.encounterRole;
    delete data.party;

    await db.runAsync(
        `INSERT INTO characters (
       id,
       name,
       data_json,
       category,
       challenge_rating,
       encounter_role,
       party
     )
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       data_json = excluded.data_json,
       category = excluded.category,
       challenge_rating = excluded.challenge_rating,
       encounter_role = excluded.encounter_role,
       party = excluded.party,
       updated_at = CURRENT_TIMESTAMP`,
        id,
        character.name,
        JSON.stringify(data),
        character.category.trim(),
        character.challengeRating,
        character.encounterRole.trim(),
        character.party ? 1 : 0,
    );

    return id;
}

export async function loadCharacter(
    characterId: string,
): Promise<Character> {
    const db = await getDatabase();

    const row = await db.getFirstAsync<{
        data_json: string;
        category: string;
        challenge_rating: number | null;
        encounter_role: string;
        party: number;
    }>(
        `SELECT
       data_json,
       category,
       challenge_rating,
       encounter_role,
       party
     FROM characters
     WHERE id = ?`,
        characterId,
    );

    if (!row) {
        throw new Error(`Character not found: ${characterId}`);
    }

    const data = JSON.parse(row.data_json) as Record<string, unknown>;

    // Rehydrate the independent database columns into the Character model.
    return characterFromJSON(
        JSON.stringify({
            ...data,
            category: row.category,
            challengeRating: row.challenge_rating,
            encounterRole: row.encounter_role,
            party: row.party === 1,
        }),
    );
}

export async function listCharacters(
    filters: CharacterFilters = {},
): Promise<CharacterSummary[]> {
    const db = await getDatabase();

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.category?.trim()) {
        conditions.push('LOWER(category) = LOWER(?)');
        params.push(filters.category.trim());
    }

    if (filters.encounterRole?.trim()) {
        conditions.push('LOWER(encounter_role) = LOWER(?)');
        params.push(filters.encounterRole.trim());
    }

    if (filters.party !== undefined) {
        conditions.push('party = ?');
        params.push(filters.party ? 1 : 0);
    }

    if (filters.minChallengeRating !== undefined) {
        conditions.push('challenge_rating >= ?');
        params.push(filters.minChallengeRating);
    }

    if (filters.maxChallengeRating !== undefined) {
        conditions.push('challenge_rating <= ?');
        params.push(filters.maxChallengeRating);
    }

    const whereClause =
        conditions.length > 0
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

    return db.getAllAsync<CharacterSummary>(
        `SELECT
       id,
       name,
       category,
       challenge_rating,
       encounter_role,
       party,
       created_at,
       updated_at
     FROM characters
     ${whereClause}
     ORDER BY updated_at DESC`,
        ...params,
    );
}

export async function deleteCharacter(
    characterId: string,
): Promise<void> {
    const db = await getDatabase();

    const result = await db.runAsync(
        'DELETE FROM characters WHERE id = ?',
        characterId,
    );

    if (result.changes === 0) {
        throw new Error(`Character not found: ${characterId}`);
    }
}

export async function duplicateCharacter(
    characterId: string,
): Promise<string> {
    const original = await loadCharacter(characterId);

    const copy = characterFromJSON(characterToJSON(original));
    copy.id = Crypto.randomUUID();
    copy.name = `${original.name} (Copy)`;

    return saveCharacter(copy);
}

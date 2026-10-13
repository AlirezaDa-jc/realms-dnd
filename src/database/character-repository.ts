
import { Character } from '@/models/character';
import { characterFromJSON, characterToJSON } from './character-serializer';
import { getDatabase } from './database';

export type CharacterSummary = {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
};

export async function saveCharacter(
    character: Character,
    characterId?: string,
): Promise<string> {
    const db = await getDatabase();
    const id = characterId ?? character.id;

    // Keep the ID in the serialized model consistent with the database.
    character.id = id;

    await db.runAsync(
        `INSERT INTO characters (id, name, data_json)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       data_json = excluded.data_json,
       updated_at = CURRENT_TIMESTAMP`,
        id,
        character.name,
        characterToJSON(character),
    );

    return id;
}

export async function loadCharacter(
    characterId: string,
): Promise<Character> {
    const db = await getDatabase();

    const row = await db.getFirstAsync<{ data_json: string }>(
        'SELECT data_json FROM characters WHERE id = ?',
        characterId,
    );

    if (!row) {
        throw new Error(`Character not found: ${characterId}`);
    }

    return characterFromJSON(row.data_json);
}

export async function listCharacters(): Promise<CharacterSummary[]> {
    const db = await getDatabase();

    return db.getAllAsync<CharacterSummary>(
        `SELECT id, name, created_at, updated_at
     FROM characters
     ORDER BY updated_at DESC`,
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
    copy.id = crypto.randomUUID();
    copy.name = `${original.name} (Copy)`;

    return saveCharacter(copy);
}

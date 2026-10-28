import { characterFromJSON, characterToJSON } from '@/database/character-serializer';
import type { Character } from '@/models/character';

const API_BASE_URL = 'http://192.168.1.100:3000/api';

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

    const body = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            body?.error ??
            body?.message ??
            `API request failed (${response.status})`,
        );
    }

    return body as T;
}

export type CharacterSummary = {
    id: string;
    name: string;
    category: string | null;
    challenge_rating: number | null;
    encounter_role: string | null;
    party: number | boolean;
    created_at?: string;
    updated_at?: string;
};

type CharacterResponse = {
    character: unknown;
};

function serializeCharacter(character: Character): Record<string, unknown> {
    return JSON.parse(characterToJSON(character)) as Record<string, unknown>;
}

function deserializeCharacter(data: unknown): Character {
    return characterFromJSON(
        typeof data === 'string' ? data : JSON.stringify(data),
    );
}

export async function listCharacters(): Promise<CharacterSummary[]> {
    return request<CharacterSummary[]>('/characters');
}

export async function loadCharacter(id: string): Promise<Character> {
    const result = await request<CharacterResponse | unknown>(
        `/characters/${encodeURIComponent(id)}`,
    );

    // Supports either { character: ... } or a direct character response.
    const data =
        result &&
            typeof result === 'object' &&
            'character' in result
            ? (result as CharacterResponse).character
            : result;

    return deserializeCharacter(data);
}

export async function saveCharacter(
    character: Character,
    characterId?: string,
): Promise<void> {
    const id = characterId ?? character.id;

    if (!id) {
        throw new Error('Cannot save a character without an ID.');
    }

    const payload = {
        ...serializeCharacter(character),
        id,
    };

    await request(`/characters/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function createCharacter(
    character: Character,
): Promise<Character> {
    const payload = serializeCharacter(character);

    const result = await request<CharacterResponse | unknown>(
        '/characters',
        {
            method: 'POST',
            body: JSON.stringify(payload),
        },
    );

    const data =
        result &&
            typeof result === 'object' &&
            'character' in result
            ? (result as CharacterResponse).character
            : result;

    return deserializeCharacter(data);
}

export async function deleteCharacter(id: string): Promise<void> {
    await request(`/characters/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
}

export async function duplicateCharacter(id: string): Promise<string> {
    const original = await loadCharacter(id);

    const copy = deserializeCharacter(serializeCharacter(original));
    const newId = createLocalId();

    copy.id = newId;
    copy.name = `${original.name} (Copy)`;

    await saveCharacter(copy, newId);

    return newId;
}

export async function setCharacterParty(
    id: string,
    party: boolean,
): Promise<Character> {
    const character = await loadCharacter(id);
    character.party = party;

    await saveCharacter(character, id);

    return character;
}

function createLocalId(): string {
    return `character-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
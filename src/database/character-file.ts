import {
    characterFromJSON,
    characterToJSON,
} from '@/database/character-serializer';
import { Character } from '@/models/character';

const CHARACTER_FILE_VERSION = 1;

type CharacterFile = {
    format: 'realms-character';
    version: number;
    exportedAt: string;
    character: unknown;
};

export function exportCharacter(character: Character): string {
    const file: CharacterFile = {
        format: 'realms-character',
        version: CHARACTER_FILE_VERSION,
        exportedAt: new Date().toISOString(),
        character: JSON.parse(characterToJSON(character)),
    };

    return JSON.stringify(file, null, 2);
}

export function importCharacter(json: string): Character {
    const file: unknown = JSON.parse(json);

    if (
        typeof file !== 'object' ||
        file === null ||
        !('format' in file) ||
        file.format !== 'realms-character' ||
        !('version' in file) ||
        file.version !== CHARACTER_FILE_VERSION ||
        !('character' in file)
    ) {
        throw new Error('Invalid or unsupported Realms character file.');
    }

    const characterData = file.character;

    if (
        typeof characterData !== 'object' ||
        characterData === null ||
        !('name' in characterData) ||
        typeof characterData.name !== 'string' ||
        !characterData.name.trim()
    ) {
        throw new Error('The imported file does not contain a valid character.');
    }

    const character = characterFromJSON(
        JSON.stringify(characterData),
    );

    // Import as a new character; never overwrite an existing character.
    character.id = crypto.randomUUID();

    return character;
}
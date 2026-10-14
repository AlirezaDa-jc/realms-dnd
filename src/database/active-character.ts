import { listCharacters, loadCharacter } from '@/database/character-repository';
import { loadSetting, saveSetting } from '@/database/settings-repository';
import { Character } from '@/models/character';

const LAST_CHARACTER_KEY = 'last_character_id';

export async function loadActiveCharacter(): Promise<Character | null> {
    const characters = await listCharacters();

    if (characters.length === 0) {
        return null;
    }

    const lastCharacterId = await loadSetting(LAST_CHARACTER_KEY);

    const hasLastCharacter = characters.some(
        (item) => item.id === lastCharacterId,
    );

    const characterId = hasLastCharacter
        ? lastCharacterId!
        : characters[0].id;

    const character = await loadCharacter(characterId);

    if (characterId !== lastCharacterId) {
        await saveSetting(LAST_CHARACTER_KEY, character.id);
    }

    return character;
}

export async function setActiveCharacter(
    characterId: string,
): Promise<Character> {
    const character = await loadCharacter(characterId);

    await saveSetting(LAST_CHARACTER_KEY, characterId);

    return character;
}
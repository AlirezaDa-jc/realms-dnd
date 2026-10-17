import type { Ability } from '@/rules/dnd5e-2024';

export type CharacterClassLevel = {
    characterClass: string;
    subClass: string;
    level: number;
    spellcastingAbility?: Ability | null;
};
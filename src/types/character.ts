import { ABILITIES } from '@/data/character-options';

export type AbilityKey = (typeof ABILITIES)[number]['key'];

export type AbilityScores = Record<AbilityKey, number | null>;

export type CharacterFormValues = {
  name: string;
  species: string;
  characterClass: string;
  level: number;
  background: string;
  abilities: AbilityScores;
  maxHp: number | null;
  currentHp: number | null;
  speed: number | null;
};

export type Character = CharacterFormValues & {
  id: string;
  temporaryHp: number;
};
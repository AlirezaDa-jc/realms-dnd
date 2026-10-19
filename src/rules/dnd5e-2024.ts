
export const ABILITIES = [
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha',
] as const;

export type Ability = (typeof ABILITIES)[number];

export const SKILLS = [
  'acrobatics',
  'animal_handling',
  'arcana',
  'athletics',
  'deception',
  'history',
  'insight',
  'intimidation',
  'investigation',
  'medicine',
  'nature',
  'perception',
  'performance',
  'persuasion',
  'religion',
  'sleight_of_hand',
  'stealth',
  'survival',
] as const;

export type Skill = (typeof SKILLS)[number];

export const COMBAT_STATS = [
  'armor_class',
  'initiative',
  'speed',
  'spell_save_dc',
  'spell_attack_bonus',
  'spell_casting_modifier',
] as const;

export type CombatStat = (typeof COMBAT_STATS)[number];

export const BONUS_CATEGORIES = [
    'ability_score',
    'ability_check',
    'saving_throw',
    'skill',
    'weapon_attack',
    'weapon_damage',
] as const;

export type BonusCategory = (typeof BONUS_CATEGORIES)[number];

export type ProficiencyLevel = 0 | 1 | 2;

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonus(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > 20) {
    throw new RangeError('Level must be between 1 and 20.');
  }

  return Math.floor((level - 1) / 4) + 2;
}

export function spellAttackBonus(
  spellcastingScore: number,
  proficiency: number,
): number {
  return abilityModifier(spellcastingScore) + proficiency;
}

export function spellSaveDc(
  spellcastingScore: number,
  proficiency: number,
): number {

  return 8 + abilityModifier(spellcastingScore) + proficiency;
}

export function spellCastingMod(
  spellcastingScore: number,
): number {

  return abilityModifier(spellcastingScore);
}


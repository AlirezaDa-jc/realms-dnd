export const SPECIES_GROUPS = [
  {
    label: 'Common',
    options: [
      'Dragonborn',
      'Dwarf',
      'Elf',
      'Gnome',
      'Half-Elf',
      'Half-Orc',
      'Halfling',
      'Human',
      'Tiefling',
    ],
  },
  {
    label: 'Exotic',
    options: [
      'Aarakocra',
      'Aasimar',
      'Changeling',
      'Deep Gnome',
      'Duergar',
      'Eladrin',
      'Fairy',
      'Firbolg',
      'Genasi (Air)',
      'Genasi (Earth)',
      'Genasi (Fire)',
      'Genasi (Water)',
      'Githyanki',
      'Githzerai',
      'Goliath',
      'Harengon',
      'Kenku',
      'Locathah',
      'Owlin',
      'Satyr',
      'Sea Elf',
      'Shadar-Kai',
      'Tabaxi',
      'Tortle',
      'Triton',
      'Verdan',
    ],
  },
  {
    label: 'Monstrous',
    options: [
      'Bugbear',
      'Centaur',
      'Goblin',
      'Grung',
      'Hobgoblin',
      'Kobold',
      'Lizardfolk',
      'Minotaur',
      'Orc',
      'Shifter',
      'Yuan-Ti',
      'Lesser Devil'
    ],
  },
] as const;

export const CHARACTER_CLASSES = [
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Warlock',
  'Wizard',
  'Artificer',
] as const;

export const ABILITIES = [
  { label: 'STR', key: 'str' },
  { label: 'DEX', key: 'dex' },
  { label: 'CON', key: 'con' },
  { label: 'INT', key: 'int' },
  { label: 'WIS', key: 'wis' },
  { label: 'CHA', key: 'cha' },
] as const;

export const MAX_CHARACTER_LEVEL = 20;

export const CHALLENGE_RATING_OPTIONS = [
  'Not set',
  '0',
  '1/8',
  '1/4',
  '1/2',
  ...Array.from({ length: 30 }, (_, index) =>
    String(index + 1),
  ),
] as const;

export function parseChallengeRating(label: string): number | null {
  switch (label) {
    case 'Not set':
      return null;
    case '1/8':
      return 0.125;
    case '1/4':
      return 0.25;
    case '1/2':
      return 0.5;
    default:
      return Number(label);
  }
}

export function formatChallengeRating(
  value: number | null,
): string {
  if (value === null) return 'Not set';
  if (value === 0.125) return '1/8';
  if (value === 0.25) return '1/4';
  if (value === 0.5) return '1/2';

  return String(value);
}

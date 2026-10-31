import type { CharacterClassLevel } from '@/models/class-level';
import { Character } from '@/models/character';
import { ClassAction } from '@/models/class-action';
import { EquipmentItem } from '@/models/equipment';
import { CharacterResource } from '@/models/resource';
import { Spell } from '@/models/spell';
import { SpellSlot } from '@/models/spell-slot';
import { Spellbook } from '@/models/spellbook';
import { StatBonus } from '@/models/stat-bonus';
import { Weapon } from '@/models/weapon';

type SerializedResource = {
  name: string;
  maximum: number;
  current: number;
  recovery?: 'short_rest' | 'long_rest' | 'manual' | 'never';
};

export function characterToJSON(character: Character): string {
  return JSON.stringify(character);
}

export function characterFromJSON(json: string): Character {
  const parsed = JSON.parse(json);
  const data = parsed.character ?? parsed;

  // Migrate legacy single-class data to classLevels.
  const classLevels: CharacterClassLevel[] = Array.isArray(data.classLevels)
    ? data.classLevels
    : typeof data.characterClass === 'string' &&
        data.characterClass.trim().length > 0
      ? [
          {
            characterClass: data.characterClass,
            subClass: typeof data.subClass === 'string' ? data.subClass : '',
            level:
              Number.isInteger(Number(data.level)) && Number(data.level) >= 1
                ? Number(data.level)
                : 1,
          },
        ]
      : [];

  // Remove legacy fields so classLevels is the source of truth.
  const {
    characterClass: _legacyClass,
    subClass: _legacySubclass,
    level: _legacyLevel,
    ...characterData
  } = data;

  const character = new Character({
    ...characterData,
    classLevels,

    // Nested models are restored below.
    spellbook: new Spellbook(),
    spellSlots: {},
    resources: [],
    classActions: [],
    equipment: [],
    weapons: [],
    statBonuses: [],
  });

  character.spellbook = new Spellbook(
    (data.spellbook?.spells ?? []).map(
      (spell: ConstructorParameters<typeof Spell>[0]) => new Spell(spell),
    ),
  );

  character.spellSlots = Object.fromEntries(
    Object.entries(data.spellSlots ?? {}).map(([level, value]) => [
      Number(level),
      new SpellSlot(
        (value as SpellSlot).level,
        (value as SpellSlot).maximum,
        (value as SpellSlot).current,
      ),
    ]),
  );
  character.resources = ((data.resources ?? []) as SerializedResource[]).map(
    (resource) =>
      new CharacterResource(
        resource.name,
        resource.maximum,
        resource.current,
        resource.recovery,
      ),
  );

  character.classActions = (data.classActions ?? []).map(
    (action: ConstructorParameters<typeof ClassAction>[0]) =>
      new ClassAction(action),
  );

  character.equipment = (data.equipment ?? []).map(
    (item: EquipmentItem) =>
      new EquipmentItem(
        item.name,
        item.quantity,
        item.weight,
        item.value,
        item.description,
      ),
  );

  character.statBonuses = (data.statBonuses ?? []).map(
    (bonus: StatBonus) =>
      new StatBonus(bonus.stat, bonus.amount, bonus.reason, bonus.category),
  );

  character.weapons = (data.weapons ?? []).map(
    (weapon: ConstructorParameters<typeof Weapon>[0]) => new Weapon(weapon),
  );

  return character;
}

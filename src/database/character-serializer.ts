
import { Character } from '@/models/character';
import { ClassAction } from '@/models/class-action';
import { EquipmentItem } from '@/models/equipment';
import { CharacterResource } from '@/models/resource';
import { Spell } from '@/models/spell';
import { SpellSlot } from '@/models/spell-slot';
import { Spellbook } from '@/models/spellbook';
import { StatBonus } from '@/models/stat-bonus';

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
    const data = JSON.parse(json);

    const character = new Character({
        ...data,

        // Nested models are restored below.
        spellbook: new Spellbook(),
        spellSlots: {},
        resources: [],
        classActions: [],
        equipment: [],
        statBonuses: [],
    });

    character.spellbook = new Spellbook(
        (data.spellbook?.spells ?? []).map(
            (spell: ConstructorParameters<typeof Spell>[0]) =>
                new Spell(spell),
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



    character.resources = (data.resources as SerializedResource[] ?? []).map(
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
        (item: ConstructorParameters<typeof EquipmentItem>) =>
            new EquipmentItem(item.name, item.quantity, item.weight),
    );

    character.statBonuses = (data.statBonuses ?? []).map(
        (bonus: ConstructorParameters<typeof StatBonus>) =>
            new StatBonus(
                bonus.stat,
                bonus.amount,
                bonus.reason,
                bonus.category,
            ),
    );

    return character;
}

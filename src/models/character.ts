
import {
    ABILITIES,
    SKILLS,
    abilityModifier as calculateAbilityModifier,
    proficiencyBonus as calculateProficiencyBonus,
    spellAttackBonus as calculateSpellAttackBonus,
    spellSaveDc as calculateSpellSaveDc,
    type Ability,
    type ProficiencyLevel,
    type Skill,
} from '@/rules/dnd5e-2024';

import { ClassAction } from './class-action';
import { EquipmentItem } from './equipment';
import { CharacterResource, type RecoveryType } from './resource';
import { SpellSlot } from './spell-slot';
import { Spellbook } from './spellbook';
import { StatBonus } from './stat-bonus';

export type { Ability, ProficiencyLevel };

export const DEFAULT_SPELLCASTING_ABILITIES: Partial<
    Record<string, Ability>
> = {
    Artificer: 'int',
    Bard: 'cha',
    Cleric: 'wis',
    Druid: 'wis',
    Paladin: 'cha',
    Ranger: 'wis',
    Sorcerer: 'cha',
    Warlock: 'cha',
    Wizard: 'int',
};

const DEFAULT_ABILITIES: Record<Ability, number> = {
    str: 10,
    dex: 16,
    con: 14,
    int: 18,
    wis: 12,
    cha: 10,
};

const DEFAULT_SKILL_PROFICIENCIES: Record<Skill, ProficiencyLevel> = {
    acrobatics: 0,
    animal_handling: 0,
    arcana: 0,
    athletics: 0,
    deception: 0,
    history: 0,
    insight: 0,
    intimidation: 0,
    investigation: 0,
    medicine: 0,
    nature: 0,
    perception: 0,
    performance: 0,
    persuasion: 0,
    religion: 0,
    sleight_of_hand: 0,
    stealth: 0,
    survival: 0,
};

type DefenseCategory =
    | 'resistance'
    | 'damage_immunity'
    | 'vulnerability'
    | 'condition_immunity';

export type CharacterInit = Partial<Omit<Character, 'id'>> & {
    id?: string;
};

export class Character {
    // Identity
    id: string;
    name = 'Kaelen';
    species = 'Elf';
    characterClass = 'Wizard';
    level = 1;
    background = 'Sage';

    // Armor
    baseArmorClass = 10;
    armorProficiencies: string[] = [];
    armorUsesDexModifier = true;
    armorDexModifierHasLimit = false;
    armorDexModifierLimit: number | null = null;

    // Ability scores
    abilities: Record<Ability, number> = { ...DEFAULT_ABILITIES };

    // Spells
    spellbook = new Spellbook();
    spellSlots: Record<number, SpellSlot> = {};

    // Saving throws and skills
    savingThrowProficiencies: Record<Ability, ProficiencyLevel> = {
        str: 0,
        dex: 0,
        con: 0,
        int: 0,
        wis: 0,
        cha: 0,
    };
    skillProficiencies: Record<Skill, ProficiencyLevel> = {
        ...DEFAULT_SKILL_PROFICIENCIES,
    };

    // Spellcasting
    spellcastingAbility: Ability | null = null;

    // Defenses
    damageResistances: string[] = [];
    damageImmunities: string[] = [];
    damageVulnerabilities: string[] = [];
    conditionImmunities: string[] = [];

    // Class features and resources
    classActions: ClassAction[] = [];
    resources: CharacterResource[] = [];

    // Hit points
    maxHp = 10;
    currentHp = 10;
    temporaryHp = 0;

    // Movement
    speed = 30;

    // Character details
    traits: string[] = [];
    ideals = '';
    bonds = '';
    flaws = '';
    languages: string[] = [];
    weaponProficiencies: string[] = [];
    toolProficiencies: string[] = [];
    equipment: EquipmentItem[] = [];
    inspiration = false;
    notes = '';
    portraitPath = '';
    logs: string[] = [];
    statBonuses: StatBonus[] = [];

    constructor(data: CharacterInit = {}) {
        Object.assign(this, data);

        this.id =
            data.id ??
            `character-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        // Merge partial maps with defaults instead of losing missing keys.
        this.abilities = {
            ...DEFAULT_ABILITIES,
            ...data.abilities,
        };

        this.savingThrowProficiencies = {
            str: 0,
            dex: 0,
            con: 0,
            int: 0,
            wis: 0,
            cha: 0,
            ...data.savingThrowProficiencies,
        };

        this.skillProficiencies = {
            ...DEFAULT_SKILL_PROFICIENCIES,
            ...data.skillProficiencies,
        };

        if (data.spellcastingAbility !== undefined) {
            this.spellcastingAbility = data.spellcastingAbility;
        } else {
            this.spellcastingAbility =
                DEFAULT_SPELLCASTING_ABILITIES[this.characterClass] ?? null;
        }

        this.validate();
    }

    validate(): void {
        if (!Number.isInteger(this.level) || this.level < 1 || this.level > 20) {
            throw new Error('Level must be between 1 and 20.');
        }

        if (
            ABILITIES.some(
                (ability) =>
                    !Number.isInteger(this.abilities[ability]) ||
                    this.abilities[ability] < 1 ||
                    this.abilities[ability] > 30,
            )
        ) {
            throw new Error(
                'Abilities must contain STR, DEX, CON, INT, WIS and CHA with scores from 1 to 30.',
            );
        }

        if (
            this.spellcastingAbility !== null &&
            !(ABILITIES as readonly string[]).includes(this.spellcastingAbility)
        ) {
            throw new Error('Invalid spellcasting ability.');
        }

        if (this.maxHp < 0) {
            throw new Error('Maximum HP cannot be negative.');
        }

        if (this.currentHp < 0 || this.currentHp > this.maxHp) {
            throw new Error(
                'Current HP must be between 0 and maximum HP.',
            );
        }

        if (this.temporaryHp < 0) {
            throw new Error('Temporary HP cannot be negative.');
        }

        if (this.speed < 0) {
            throw new Error('Speed cannot be negative.');
        }
    }

    abilityScore(ability: Ability): number {
        return this.abilities[ability] +
            this.totalStatBonus(ability, 'ability_score');
    }

    abilityModifier(ability: Ability): number {
        return calculateAbilityModifier(this.abilityScore(ability));
    }

    get proficiencyBonus(): number {
        return calculateProficiencyBonus(this.level);
    }

    private spellcastingScore(): number {
        if (this.spellcastingAbility === null) {
            throw new Error(
                "Set the character's spellcasting ability first.",
            );
        }

        return this.abilityScore(this.spellcastingAbility);
    }

    get spellAttackBonus(): number {
        return calculateSpellAttackBonus(
            this.spellcastingScore(),
            this.proficiencyBonus,
        );
    }

    get spellSaveDc(): number {
        return (
            calculateSpellSaveDc(
                this.spellcastingScore(),
                this.proficiencyBonus,
            ) + this.totalStatBonus('spell_save_dc')
        );
    }

    get spellcastingModifier(): number {
        if (this.spellcastingAbility === null) {
            throw new Error(
                'This character has no spellcasting ability configured.',
            );
        }

        return this.abilityModifier(this.spellcastingAbility);
    }

    get totalSpeed(): number {
        return this.speed + this.totalStatBonus('speed');
    }

    get armorClass(): number {
        return (
            this.baseArmorClass +
            this.getArmorDexModifier() +
            this.totalStatBonus('armor_class')
        );
    }

    get initiative(): number {
        return (
            this.abilityModifier('dex') +
            this.totalStatBonus('initiative')
        );
    }

    proficiencyValue(level: ProficiencyLevel): number {
        if (level === 0) return 0;
        if (level === 1) return this.proficiencyBonus;
        if (level === 2) return this.proficiencyBonus * 2;

        throw new Error('Proficiency level must be 0, 1, or 2.');
    }

    savingThrowBonus(ability: Ability): number {
        return (
            this.abilityModifier(ability) +
            this.proficiencyValue(this.savingThrowProficiencies[ability]) +
            this.totalStatBonus(ability, 'saving_throw')
        );
    }

    abilityCheckBonus(ability: Ability): number {
        return (
            this.abilityModifier(ability) +
            this.totalStatBonus(ability, 'ability_check')
        );
    }

    skillBonus(skill: Skill): number {
        const skillAbilities: Record<Skill, Ability> = {
            acrobatics: 'dex',
            animal_handling: 'wis',
            arcana: 'int',
            athletics: 'str',
            deception: 'cha',
            history: 'int',
            insight: 'wis',
            intimidation: 'cha',
            investigation: 'int',
            medicine: 'wis',
            nature: 'int',
            perception: 'wis',
            performance: 'cha',
            persuasion: 'cha',
            religion: 'int',
            sleight_of_hand: 'dex',
            stealth: 'dex',
            survival: 'wis',
        };

        const ability = skillAbilities[skill];

        return (
            this.abilityModifier(ability) +
            this.proficiencyValue(this.skillProficiencies[skill]) +
            this.totalStatBonus(skill, 'skill') +
            this.totalStatBonus(ability, 'ability_check')
        );
    }

    setArmorDexRule(
        usesDexModifier: boolean,
        hasLimit = false,
        limit: number | null = null,
    ): void {
        if (hasLimit && limit === null) {
            throw new Error(
                'A limit is required when the limit is enabled.',
            );
        }

        if (hasLimit && limit! < 0) {
            throw new Error(
                'The Dexterity modifier limit cannot be negative.',
            );
        }

        this.armorUsesDexModifier = usesDexModifier;
        this.armorDexModifierHasLimit = hasLimit;
        this.armorDexModifierLimit = hasLimit ? limit : null;
    }

    getArmorDexModifier(): number {
        if (!this.armorUsesDexModifier) {
            return 0;
        }

        const dexModifier = this.abilityModifier('dex');

        if (this.armorDexModifierHasLimit) {
            if (this.armorDexModifierLimit === null) {
                throw new Error(
                    'Armor Dexterity modifier limit is not configured.',
                );
            }

            return Math.min(dexModifier, this.armorDexModifierLimit);
        }

        return dexModifier;
    }

    setAbilityScore(ability: Ability, score: number): void {
        if (!(ABILITIES as readonly string[]).includes(ability)) {
            throw new Error(`Unknown ability: ${ability}`);
        }

        if (!Number.isInteger(score) || score < 1 || score > 30) {
            throw new Error('Ability score must be between 1 and 30.');
        }

        this.abilities[ability] = score;
    }

    private defenseList(category: DefenseCategory): string[] {
        const lists: Record<DefenseCategory, string[]> = {
            resistance: this.damageResistances,
            damage_immunity: this.damageImmunities,
            vulnerability: this.damageVulnerabilities,
            condition_immunity: this.conditionImmunities,
        };

        return lists[category];
    }

    addDefense(category: DefenseCategory, value: string): void {
        const normalized = value.trim();

        if (!normalized) {
            throw new Error('Defense value cannot be empty.');
        }

        const defenses = this.defenseList(category);

        if (
            !defenses.some(
                (item) => item.toLocaleLowerCase() === normalized.toLocaleLowerCase(),
            )
        ) {
            defenses.push(normalized);
        }
    }

    removeDefense(category: DefenseCategory, value: string): void {
        const defenses = this.defenseList(category);
        const index = defenses.findIndex(
            (item) =>
                item.toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
        );

        if (index !== -1) {
            defenses.splice(index, 1);
        }
    }

    hasDefense(category: DefenseCategory, value: string): boolean {
        return this.defenseList(category).some(
            (item) =>
                item.toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
        );
    }

    addResource(
        name: string,
        maximum: number,
        recovery: RecoveryType = 'short_rest',
        current?: number,
    ): CharacterResource {
        if (
            this.resources.some(
                (resource) =>
                    resource.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
            )
        ) {
            throw new Error(`Resource '${name}' already exists.`);
        }

        const resource = new CharacterResource(
            name,
            maximum,
            current ?? maximum,
            recovery,
        );

        this.resources.push(resource);
        return resource;
    }

    getResource(name: string): CharacterResource {
        const resource = this.resources.find(
            (item) =>
                item.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
        );

        if (!resource) {
            throw new Error(`Resource '${name}' was not found.`);
        }

        return resource;
    }

    addProficiencyItem(
        category: 'language' | 'weapon' | 'tool',
        value: string,
    ): void {
        const normalized = value.trim();

        if (!normalized) {
            throw new Error('Value cannot be empty.');
        }

        const categories = {
            language: this.languages,
            weapon: this.weaponProficiencies,
            tool: this.toolProficiencies,
        };

        const items = categories[category];

        if (
            items.some(
                (item) =>
                    item.toLocaleLowerCase() === normalized.toLocaleLowerCase(),
            )
        ) {
            throw new Error(`${normalized} already exists.`);
        }

        items.push(normalized);
    }

    removeProficiencyItem(
        category: 'language' | 'weapon' | 'tool',
        value: string,
    ): void {
        const categories = {
            language: this.languages,
            weapon: this.weaponProficiencies,
            tool: this.toolProficiencies,
        };

        const items = categories[category];
        const index = items.findIndex(
            (item) =>
                item.toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
        );

        if (index === -1) {
            throw new Error(`${value} not found.`);
        }

        items.splice(index, 1);
    }

    addTrait(trait: string): void {
        const normalized = trait.trim();

        if (!normalized) {
            throw new Error('Trait cannot be empty.');
        }

        if (
            this.traits.some(
                (item) =>
                    item.toLocaleLowerCase() === normalized.toLocaleLowerCase(),
            )
        ) {
            throw new Error('Trait already exists.');
        }

        this.traits.push(normalized);
    }

    removeTrait(trait: string): void {
        const index = this.traits.findIndex(
            (item) =>
                item.toLocaleLowerCase() === trait.trim().toLocaleLowerCase(),
        );

        if (index === -1) {
            throw new Error(`Trait not found: ${trait}`);
        }

        this.traits.splice(index, 1);
    }

    setSpellSlots(
        level: number,
        maximum: number,
        current?: number,
    ): void {
        this.spellSlots[level] = new SpellSlot(
            level,
            maximum,
            current ?? maximum,
        );
    }

    getSpellSlots(level: number): SpellSlot {
        const slot = this.spellSlots[level];

        if (!slot) {
            throw new Error(`No spell slots configured for level ${level}.`);
        }

        return slot;
    }

    restoreSpellSlots(level?: number, amount?: number): void {
        if (level === undefined) {
            Object.values(this.spellSlots).forEach(
                (slot) => slot.restore(amount),
            );
            return;
        }

        this.getSpellSlots(level).restore(amount);
    }

    takeDamage(amount: number): void {
        if (amount < 0) {
            throw new Error('Damage cannot be negative.');
        }

        const absorbed = Math.min(amount, this.temporaryHp);
        const remainingDamage = Math.max(0, amount - this.temporaryHp);

        this.temporaryHp -= absorbed;
        this.currentHp = Math.max(0, this.currentHp - remainingDamage);
    }

    heal(amount: number): void {
        if (amount < 0) {
            throw new Error('Healing cannot be negative.');
        }

        this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
    }

    setTemporaryHp(amount: number): void {
        if (amount < 0) {
            throw new Error('Temporary HP cannot be negative.');
        }

        this.temporaryHp = Math.max(this.temporaryHp, amount);
    }

    takeRest(restType: RecoveryType): void {
        if (restType !== 'short_rest' && restType !== 'long_rest') {
            throw new Error('Rest type must be short_rest or long_rest.');
        }

        if (restType === 'long_rest') {
            this.currentHp = this.maxHp;
            this.temporaryHp = 0;
            this.restoreSpellSlots();
            this.logs = [];
        }

        for (const resource of this.resources) {
            if (resource.recoverOn(restType) || restType === 'long_rest') {
                resource.restore();
            }
        }

        for (const action of this.classActions) {
            if (action.recoverOn(restType)) {
                action.restoreUses();
            }
        }
    }

    getStatBonuses(
        stat: string,
        category: string | null = null,
    ): StatBonus[] {
        return this.statBonuses.filter(
            (bonus) => bonus.stat === stat && bonus.category === category,
        );
    }

    totalStatBonus(
        stat: string,
        category: string | null = null,
    ): number {
        return this.getStatBonuses(stat, category).reduce(
            (total, bonus) => total + bonus.amount,
            0,
        );
    }

    setSkillProficiency(skill: Skill, level: ProficiencyLevel): void {
        if (!(SKILLS as readonly string[]).includes(skill)) {
            throw new Error(`Unknown skill: ${skill}`);
        }

        if (![0, 1, 2].includes(level)) {
            throw new Error('Proficiency level must be 0, 1, or 2.');
        }

        this.skillProficiencies[skill] = level;
    }

    setSavingThrowProficiency(
        ability: Ability,
        level: 0 | 1,
    ): void {
        if (!(ABILITIES as readonly string[]).includes(ability)) {
            throw new Error(`Unknown ability: ${ability}`);
        }

        if (level !== 0 && level !== 1) {
            throw new Error('Saving throw proficiency must be 0 or 1.');
        }

        this.savingThrowProficiencies[ability] = level;
    }
}

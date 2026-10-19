
import type { Ability } from '@/rules/dnd5e-2024';
import type { Character } from './character';
import { StatBonus } from './stat-bonus';

export type WeaponInit = Partial<Omit<Weapon, 'id'>> & {
    id?: string;
};

export class Weapon {
    id: string;
    name: string;

    // Attack configuration
    attackAbility: Ability;
    isProficient: boolean;

    // Damage configuration
    damageAbility: Ability;
    damageDice: string;
    damageType: string;

    // Weapon-specific bonuses
    statBonuses: StatBonus[];

    // Weapon properties
    isFinesse: boolean;
    isThrown: boolean;
    isBound: boolean;
    isUnarmed: boolean;

    constructor(data: WeaponInit = {}) {
        this.id = data.id ?? createWeaponId();
        this.name = data.name ?? '';

        this.attackAbility = data.attackAbility ?? 'str';
        this.isProficient = data.isProficient ?? true;

        this.damageAbility = data.damageAbility ?? 'str';
        this.damageDice = data.damageDice ?? '1d4';
        this.damageType = data.damageType ?? 'slashing';

        this.statBonuses = (data.statBonuses ?? []).map(
            (bonus) =>
                new StatBonus(
                    bonus.stat,
                    bonus.amount,
                    bonus.reason,
                    bonus.category,
                ),
        );

        this.isFinesse = data.isFinesse ?? false;
        this.isThrown = data.isThrown ?? false;
        this.isBound = data.isBound ?? false;
        this.isUnarmed = data.isUnarmed ?? false;

        this.validate();
    }

    validate(): void {
        const abilities: Ability[] = [
            'str', 'dex', 'con', 'int', 'wis', 'cha',
        ];

        if (!this.name.trim()) {
            throw new Error('Weapon name cannot be empty.');
        }

        if (!abilities.includes(this.attackAbility)) {
            throw new Error('Invalid attack ability.');
        }

        if (!abilities.includes(this.damageAbility)) {
            throw new Error('Invalid damage ability.');
        }

        if (!this.damageDice.trim()) {
            throw new Error('Damage dice cannot be empty.');
        }

        if (!this.damageType.trim()) {
            throw new Error('Damage type cannot be empty.');
        }

        this.name = this.name.trim();
        this.damageDice = this.damageDice.trim();
        this.damageType = this.damageType.trim();
    }

    getAttackBonus(character: Character): number {
        return (
            character.abilityModifier(this.attackAbility) +
            (this.isProficient ? character.proficiencyBonus : 0) +
            this.statBonuses
                .filter((bonus) => bonus.category === 'weapon_attack')
                .reduce((total, bonus) => total + bonus.amount, 0)
        );
    }

    getDamageBonus(character: Character): number {
        return (
            character.abilityModifier(this.damageAbility) +
            this.statBonuses
                .filter((bonus) => bonus.category === 'weapon_damage')
                .reduce((total, bonus) => total + bonus.amount, 0)
        );
    }

    getDamageFormula(character: Character): string {
        const bonus = this.getDamageBonus(character);

        if (this.isUnarmed) {
            return `${Math.max(1, Number(this.damageDice) + bonus)} ${this.damageType}`;
        }

        const modifier =
            bonus === 0
                ? ''
                : ` ${bonus > 0 ? '+' : '-'} ${Math.abs(bonus)}`;

        return `${this.damageDice}${modifier} ${this.damageType}`;
    }
}

function createWeaponId(): string {
    return `weapon-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createUnarmedStrike(): Weapon {
    return new Weapon({
        name: 'Unarmed Strike',
        attackAbility: 'str',
        damageAbility: 'str',
        damageDice: '1',
        damageType: 'bludgeoning',
        isProficient: true,
        isUnarmed: true,
    });
}

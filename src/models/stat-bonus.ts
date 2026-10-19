
import {
  ABILITIES,
  BONUS_CATEGORIES,
  COMBAT_STATS,
  SKILLS,
  type Ability,
  type BonusCategory,
  type CombatStat,
  type Skill,
} from '@/rules/dnd5e-2024';

export type BonusStat =
  | Ability
  | Skill
  | CombatStat
  | string;

export class StatBonus {
  stat: string;
  amount: number;
  reason: string;
  category: BonusCategory | null;

  constructor(
    stat: string,
    amount: number,
    reason: string,
    category: BonusCategory | null = null,
  ) {
    this.stat = stat.trim().toLowerCase();
    this.amount = amount;
    this.reason = reason.trim();
    this.category = category;

    this.validate();
  }

  private validate(): void {
    if (!this.reason) {
      throw new Error('Bonus reason cannot be empty.');
    }

    if (this.category === null) {
      if (!(COMBAT_STATS as readonly string[]).includes(this.stat)) {
        throw new Error(`Unsupported combat stat: ${this.stat}`);
      }

      return;
    }

    if (
      !(BONUS_CATEGORIES as readonly string[]).includes(this.category)
    ) {
      throw new Error(`Unsupported bonus category: ${this.category}`);
    }

    if (
      this.category === 'ability_score' ||
      this.category === 'ability_check' ||
      this.category === 'saving_throw'
    ) {
      if (!(ABILITIES as readonly string[]).includes(this.stat)) {
        throw new Error(`Unsupported ability: ${this.stat}`);
      }
    } else if (this.category === 'skill') {
      if (!(SKILLS as readonly string[]).includes(this.stat)) {
        throw new Error(`Unsupported skill: ${this.stat}`);
      }
    } else if (
      this.category === 'weapon_attack' ||
      this.category === 'weapon_damage'
    ) {
      const expectedStat =
        this.category === 'weapon_attack' ? 'attack' : 'damage';

      if (this.stat !== expectedStat) {
        throw new Error(
          `Category '${this.category}' requires stat '${expectedStat}'.`,
        );
      }
    }
  }
}


import { Spell } from './spell';

export class Spellbook {
  spells: Spell[];

  constructor(spells: Spell[] = []) {
    this.spells = [...spells];
  }

  addSpell(spell: Spell): void {
    if (
      this.spells.some(
        (existing) =>
          existing.name.toLocaleLowerCase() ===
          spell.name.toLocaleLowerCase(),
      )
    ) {
      throw new Error(`Spell already exists: ${spell.name}`);
    }

    this.spells.push(spell);
  }

  removeSpell(name: string): void {
    const index = this.spells.findIndex(
      (spell) =>
        spell.name.toLocaleLowerCase() ===
        name.trim().toLocaleLowerCase(),
    );

    if (index === -1) {
      throw new Error(`Spell not found: ${name}`);
    }

    this.spells.splice(index, 1);
  }

  getSpell(name: string): Spell {
    const spell = this.spells.find(
      (item) =>
        item.name.toLocaleLowerCase() ===
        name.trim().toLocaleLowerCase(),
    );

    if (!spell) {
      throw new Error(`Spell not found: ${name}`);
    }

    return spell;
  }

  setSpellSourceClass(name: string, sourceClass: string): void {
    const spell = this.getSpell(name);
    spell.sourceClass = sourceClass.trim();
  }

  getSpellsByLevel(level: number): Spell[] {
    return this.spells.filter((spell) => spell.level === level);
  }

  getCantrips(): Spell[] {
    return this.getSpellsByLevel(0);
  }

  getSpellsByClass(sourceClass: string): Spell[] {
    const normalizedClass = sourceClass.trim().toLocaleLowerCase();

    return this.spells.filter(
      (spell) =>
        spell.sourceClass.trim().toLocaleLowerCase() === normalizedClass,
    );
  }
}

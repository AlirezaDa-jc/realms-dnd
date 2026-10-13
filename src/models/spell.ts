
export class Spell {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  concentration: boolean;
  description: string;
  prepared: boolean;
  ritual: boolean;

  constructor({
    name,
    level,
    school = '',
    castingTime = '',
    range = '',
    components = '',
    duration = '',
    concentration = false,
    description = '',
    prepared = false,
    ritual = false,
  }: {
    name: string;
    level: number;
    school?: string;
    castingTime?: string;
    range?: string;
    components?: string;
    duration?: string;
    concentration?: boolean;
    description?: string;
    prepared?: boolean;
    ritual?: boolean;
  }) {
    this.name = name;
    this.level = level;
    this.school = school;
    this.castingTime = castingTime;
    this.range = range;
    this.components = components;
    this.duration = duration;
    this.concentration = concentration;
    this.description = description;
    this.prepared = prepared;
    this.ritual = ritual;

    this.validate();
  }

  private validate(): void {
    if (!this.name.trim()) {
      throw new Error('Spell name cannot be empty.');
    }

    if (!Number.isInteger(this.level) || this.level < 0 || this.level > 9) {
      throw new Error('Spell level must be between 0 and 9.');
    }
  }
}

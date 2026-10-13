
export class SpellSlot {
  level: number;
  maximum: number;
  current: number;

  constructor(level: number, maximum: number, current: number) {
    this.level = level;
    this.maximum = maximum;
    this.current = current;

    this.validate();
  }

  private validate(): void {
    if (!Number.isInteger(this.level) || this.level < 1 || this.level > 9) {
      throw new Error('Spell slot level must be between 1 and 9.');
    }

    if (this.maximum < 0) {
      throw new Error('Maximum spell slots cannot be negative.');
    }

    if (this.current < 0 || this.current > this.maximum) {
      throw new Error(
        'Current spell slots must be between 0 and maximum.',
      );
    }
  }

  use(amount = 1): void {
    if (amount <= 0) {
      throw new Error('Amount must be positive.');
    }

    if (amount > this.current) {
      throw new Error('Not enough spell slots remaining.');
    }

    this.current -= amount;
  }

  restore(amount?: number): void {
    if (amount === undefined) {
      this.current = this.maximum;
      return;
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive.');
    }

    this.current = Math.min(
      this.maximum,
      this.current + amount,
    );
  }

  restoreAll(): void {
    this.current = this.maximum;
  }
}

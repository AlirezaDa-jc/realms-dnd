
export const RECOVERY_TYPES = [
  'short_rest',
  'long_rest',
  'manual',
  'never',
] as const;

export type RecoveryType = (typeof RECOVERY_TYPES)[number];

export class CharacterResource {
  name: string;
  maximum: number;
  current: number;
  recovery: RecoveryType;

  constructor(
    name: string,
    maximum: number,
    current: number,
    recovery: RecoveryType = 'short_rest',
  ) {
    this.name = name;
    this.maximum = maximum;
    this.current = current;
    this.recovery = recovery;

    this.validate();
  }

  private validate(): void {
    if (this.maximum < 0) {
      throw new Error('Maximum uses cannot be negative.');
    }

    if (
      this.current < 0 ||
      this.current > this.maximum
    ) {
      throw new Error(
        'Current uses must be between 0 and maximum.',
      );
    }
  }

  use(amount = 1): void {
    if (amount <= 0) {
      throw new Error('Amount must be positive.');
    }

    if (amount > this.current) {
      throw new Error(`Not enough ${this.name} remaining.`);
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

  recoverOn(restType: RecoveryType): boolean {
    return this.recovery === restType;
  }
}

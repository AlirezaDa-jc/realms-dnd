
import type { Character } from './character';
import type { RecoveryType } from './resource';

export class ClassAction {
  name: string;
  description: string;

  resourceName: string | null;
  resourceCost: number | null;

  maximumUses: number | null;
  currentUses: number | null;
  recovery: RecoveryType | null;
  dynamicResourceCost: boolean;

  constructor({
    name,
    description = '',
    resourceName = null,
    resourceCost = null,
    maximumUses = null,
    currentUses = null,
    recovery = null,
    dynamicResourceCost = false
  }: {
    name: string;
    description?: string;
    resourceName?: string | null;
    resourceCost?: number | null;
    maximumUses?: number | null;
    currentUses?: number | null;
    recovery?: RecoveryType | null;
    dynamicResourceCost: boolean;
  }) {
    this.name = name.trim();
    this.description = description;

    this.resourceName = resourceName;
    this.resourceCost = resourceCost;

    this.maximumUses = maximumUses;
    this.currentUses = currentUses;
    this.recovery = recovery;
    this.dynamicResourceCost = dynamicResourceCost;
    this.validate();
  }

  private validate(): void {
    if (!this.name) {
      throw new Error('Action name cannot be empty.');
    }

    if (
      (this.resourceName === null) !==
      (this.resourceCost === null) && !this.dynamicResourceCost
    ) {
      throw new Error(
        'Resource name and resource cost must be configured together.',
      );
    }

    if (this.resourceName !== null) {
      this.resourceName = this.resourceName.trim();
      if (!this.dynamicResourceCost) {
        if (!this.resourceName) {
          throw new Error('Resource name cannot be empty.');
        }

        if (this.resourceCost! <= 0) {
          throw new Error('Resource cost must be positive.');
        }
      }
    }

    if (
      (this.maximumUses === null) !==
      (this.currentUses === null)
    ) {
      throw new Error(
        'Maximum uses and current uses must be configured together.',
      );
    }

    if (this.maximumUses !== null) {
      if (this.maximumUses <= 0) {
        throw new Error('Maximum uses must be positive.');
      }

      if (
        this.currentUses! < 0 ||
        this.currentUses! > this.maximumUses
      ) {
        throw new Error(
          'Current uses must be between 0 and maximum uses.',
        );
      }
    } else if (this.recovery !== null) {
      throw new Error(
        'Recovery requires a limited number of uses.',
      );
    }
  }

  get isUnlimited(): boolean {
    return (
      this.resourceName === null &&
      this.maximumUses === null
    );
  }

  use(character: Character): void {
    if (this.currentUses !== null && this.currentUses === 0) {
      throw new Error(`No uses of ${this.name} remaining.`);
    }

    if (this.resourceName !== null) {
      const resource = character.getResource(this.resourceName);
      resource.use(this.resourceCost!);
    }

    if (this.currentUses !== null) {
      this.currentUses -= 1;
    }
  }

  recoverOn(restType: RecoveryType): boolean {
    return (
      this.maximumUses !== null &&
      this.recovery === restType
    );
  }

  restoreUses(): void {
    if (this.maximumUses !== null) {
      this.currentUses = this.maximumUses;
    }
  }
}

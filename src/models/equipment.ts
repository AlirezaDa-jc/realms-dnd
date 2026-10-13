
export class EquipmentItem {
  name: string;
  quantity: number;
  weight: number;

  constructor(
    name: string,
    quantity = 1,
    weight = 0,
  ) {
    this.name = name.trim();
    this.quantity = quantity;
    this.weight = weight;

    this.validate();
  }

  private validate(): void {
    if (!this.name) {
      throw new Error('Equipment name cannot be empty.');
    }

    if (this.quantity < 1) {
      throw new Error('Quantity must be at least 1.');
    }

    if (this.weight < 0) {
      throw new Error('Weight cannot be negative.');
    }
  }
}

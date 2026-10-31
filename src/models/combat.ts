import * as Crypto from 'expo-crypto';

export type CombatStatus = 'active' | 'finished';

export type CombatOutcome =
  | 'team1_won'
  | 'team2_won'
  | 'team1_fled'
  | 'team2_fled'
  | 'draw'
  | 'incomplete';

export type CombatTeam = 'team1' | 'team2';

export type CombatantRef = {
  characterId: string;
};

export type CombatData = {
  id: string;
  campaignId?: string | null;
  name: string;

  status: CombatStatus;
  outcome: CombatOutcome | null;

  team1: CombatantRef[];
  team2: CombatantRef[];

  createdAt: string;
  startedAt: string;
  finishedAt: string | null;
};

export class Combat implements CombatData {
  id: string;
  campaignId?: string | null;
  name: string;

  status: CombatStatus;
  outcome: CombatOutcome | null;

  team1: CombatantRef[];
  team2: CombatantRef[];

  createdAt: string;
  startedAt: string;
  finishedAt: string | null;

  constructor(data: Partial<CombatData> = {}) {
    const now = new Date().toISOString();

    this.campaignId = data.campaignId;
    this.id = data.id ?? Crypto.randomUUID();
    this.name = data.name ?? 'Untitled Combat';

    this.status = data.status ?? 'active';
    this.outcome = data.outcome ?? null;

    this.team1 = data.team1 ?? [];
    this.team2 = data.team2 ?? [];

    this.createdAt = data.createdAt ?? now;
    this.startedAt = data.startedAt ?? now;
    this.finishedAt = data.finishedAt ?? null;
  }

  finish(outcome: CombatOutcome): void {
    if (this.status === 'finished') {
      throw new Error('Combat has already finished.');
    }

    this.status = 'finished';
    this.outcome = outcome;
    this.finishedAt = new Date().toISOString();
  }
}

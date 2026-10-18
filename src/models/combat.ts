import * as Crypto from 'expo-crypto';
import { Character } from '@/models/character';

export type CombatStatus = 'active' | 'finished';

export type CombatOutcome =
    | 'team1_won'
    | 'team2_won'
    | 'team1_fled'
    | 'team2_fled'
    | 'draw'
    | 'incomplete';

export type CombatTeam = 'team1' | 'team2';

export type CombatEventType =
    | 'combat_started'
    | 'combat_finished'
    | 'character_joined'
    | 'character_left'
    | 'damage'
    | 'healing'
    | 'resource_used'
    | 'resource_restored'
    | 'action'
    | 'condition_added'
    | 'condition_removed'
    | 'equipment_changed'
    | 'character_updated'
    | 'other';

/**
 * A complete copy of a character at a particular moment.
 *
 * The character contains all its data, not just its ID.
 * characterId links the snapshot back to the live character.
 */
export type CombatantSnapshot = {
    characterId: string;
    character: Character;
};

/**
 * One point in the battle timeline.
 *
 * Every entry preserves the full state of both teams
 * after the corresponding event.
 */
export type CombatHistoryEntry = {
    id: string;
    timestamp: string;

    type: CombatEventType;
    description: string;

    characterId: string | null;
    characterName: string | null;
    team: CombatTeam | null;

    /**
     * Optional numeric value, e.g. damage or healing amount.
     */
    amount: number | null;

    /**
     * Full state of both teams at this moment.
     */
    team1: CombatantSnapshot[];
    team2: CombatantSnapshot[];
};

/**
 * A complete encounter, including its current state
 * and historical checkpoints.
 */
export type CombatData = {
    id: string;
    name: string;

    status: CombatStatus;
    outcome: CombatOutcome | null;

    team1: CombatantSnapshot[];
    team2: CombatantSnapshot[];

    history: CombatHistoryEntry[];

    createdAt: string;
    startedAt: string;
    finishedAt: string | null;
};

export class Combat implements CombatData {
    id: string;
    name: string;

    status: CombatStatus;
    outcome: CombatOutcome | null;

    team1: CombatantSnapshot[];
    team2: CombatantSnapshot[];

    history: CombatHistoryEntry[];

    createdAt: string;
    startedAt: string;
    finishedAt: string | null;

    constructor(data: Partial<CombatData> = {}) {
        const now = new Date().toISOString();

        this.id = data.id ?? Crypto.randomUUID();
        this.name = data.name ?? 'Untitled Combat';

        this.status = data.status ?? 'active';
        this.outcome = data.outcome ?? null;

        this.team1 = data.team1 ?? [];
        this.team2 = data.team2 ?? [];

        this.history = data.history ?? [];

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

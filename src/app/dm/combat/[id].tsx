
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useColorScheme,
    View,
} from 'react-native';

import { useDialog } from '@/components/dialog/realms-dialog';
import { Colors, Spacing } from '@/constants/theme';
import { setActiveCharacter } from '@/database/active-character';
import {
    listCharacters,
    loadCharacter,
    saveCharacter,
} from '@/database/character-repository';
import {
    deleteCombat,
    loadCombat,
    saveCombat,
} from '@/database/combat-repository';
import type { Character } from '@/models/character';
import { Combat, type CombatData, type CombatEventType, type CombatOutcome, type CombatTeam, type CombatantSnapshot } from '@/models/combat';
import { SpellSlot } from '@/models/spell-slot';
import { CharacterResource } from '@/models/resource';

type HpAction = 'damage' | 'heal' | 'temporary';

type Candidate = {
    id: string;
    character: Character;
};

type ActionTarget = {
    characterId: string;
    team: CombatTeam;
    characterName: string;
};

const OUTCOMES: { value: CombatOutcome; label: string }[] = [
    { value: 'team1_won', label: 'Team 1 wins' },
    { value: 'team2_won', label: 'Team 2 wins' },
    { value: 'team1_fled', label: 'Team 1 fled' },
    { value: 'team2_fled', label: 'Team 2 fled' },
    { value: 'draw', label: 'Draw' },
    { value: 'incomplete', label: 'Incomplete / stopped' },
];

export default function CombatScreen() {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const router = useRouter();
    const params = useLocalSearchParams<{ id: string | string[] }>();
    const { showInfo } = useDialog();

    const combatId = Array.isArray(params.id) ? params.id[0] : params.id;

    const [combat, setCombat] = useState<Combat | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [hpTarget, setHpTarget] = useState<ActionTarget | null>(null);
    const [hpAction, setHpAction] = useState<HpAction | null>(null);
    const [hpAmount, setHpAmount] = useState('');

    const [addVisible, setAddVisible] = useState(false);
    const [addTeam, setAddTeam] = useState<CombatTeam>('team1');
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);

    const [finishVisible, setFinishVisible] = useState(false);

    const readOnly = combat?.status === 'finished';

    const loadCurrentCombat = useCallback(async () => {
        if (!combatId) {
            setError('No combat ID was provided.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const loaded = await loadCombat(combatId);
            setCombat(loaded);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Could not load combat.',
            );
        } finally {
            setLoading(false);
        }
    }, [combatId]);

    useFocusEffect(
        useCallback(() => {
            void loadCurrentCombat();
        }, [loadCurrentCombat]),
    );

    const getClasses = (character: Character) => {
        const levels = character.classLevels ?? [];

        if (levels.length === 0) {
            return character.characterClass || 'Class not set';
        }

        return levels
            .map(({ characterClass, subClass, level }) => {
                const name = subClass
                    ? `${subClass} ${characterClass}`
                    : characterClass;
                return `${name} ${level}`;
            })
            .join(' / ');
    };

    const getSpellSlots = (character: Character) =>
        Object.entries(character.spellSlots ?? {})
            .filter(([, slot]) => slot.maximum > 0)
            .sort(([a], [b]) => Number(a) - Number(b));

    const getResources = (character: Character) =>
        (character.resources ?? []).filter(
            (resource) => resource.maximum > 0,
        );

    const getDefenses = (character: Character) => [
        ...(character.damageResistances ?? []).map(
            (value) => `Resist: ${String(value)}`,
        ),
        ...(character.damageImmunities ?? []).map(
            (value) => `Immune: ${String(value)}`,
        ),
        ...(character.damageVulnerabilities ?? []).map(
            (value) => `Vulnerable: ${String(value)}`,
        ),
        ...(character.conditionImmunities ?? []).map(
            (value) => `Condition immune: ${String(value)}`,
        ),
    ];

    /*
     * Keep the Character prototype and model methods while creating an
     * independent copy of the mutable combat-related state.
     */
    const cloneCharacter = (character: Character): Character => {
        const cloned = Object.assign(
            Object.create(Object.getPrototypeOf(character)),
            character,
        ) as Character;

        cloned.spellSlots = Object.fromEntries(
            Object.entries(character.spellSlots ?? {}).map(
                ([level, slot]) => [
                    level,
                    new SpellSlot(slot.level, slot.maximum, slot.current),
                ],
            ),
        );

        cloned.resources = (character.resources ?? []).map(
            (resource) =>
                new CharacterResource(
                    resource.name,
                    resource.maximum,
                    resource.current,
                    resource.recovery,
                ),
        );

        cloned.classActions = (character.classActions ?? []).map((action) =>
            Object.assign(
                Object.create(Object.getPrototypeOf(action)),
                action,
            ),
        );

        cloned.logs = [...(character.logs ?? [])];

        // Copy arrays so historical snapshots don't share mutable arrays.
        const arrays: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(character)) {
            if (
                Array.isArray(value) &&
                !['spellSlots', 'resources', 'classActions', 'logs'].includes(key)
            ) {
                arrays[key] = value.map((item) =>
                    item && typeof item === 'object' ? { ...item } : item,
                );
            }
        }

        Object.assign(cloned, arrays);
        return cloned;
    };

    const cloneSnapshot = (
        snapshot: CombatantSnapshot,
    ): CombatantSnapshot => ({
        characterId: snapshot.characterId,
        character: cloneCharacter(snapshot.character),
    });

    const cloneTeam = (team: CombatantSnapshot[]) =>
        team.map(cloneSnapshot);

    /*
     * Every event gets a checkpoint of both teams AFTER the event.
     * Older history entries are never updated in place.
     */
    const persistEvent = async ({
        team1,
        team2,
        type,
        description,
        characterId = null,
        characterName = null,
        team = null,
        amount = null,
        nextStatus,
        nextOutcome,
        finishedAt,
    }: {
        team1: CombatantSnapshot[];
        team2: CombatantSnapshot[];
        type: CombatEventType;
        description: string;
        characterId?: string | null;
        characterName?: string | null;
        team?: CombatTeam | null;
        amount?: number | null;
        nextStatus?: 'active' | 'finished';
        nextOutcome?: CombatOutcome | null;
        finishedAt?: string | null;
    }) => {
        if (!combat) throw new Error('Combat is not loaded.');

        const savedTeam1 = cloneTeam(team1);
        const savedTeam2 = cloneTeam(team2);
        const timestamp = new Date().toISOString();

        const event = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp,
            type,
            description,
            characterId,
            characterName,
            team,
            amount,
            team1: cloneTeam(savedTeam1),
            team2: cloneTeam(savedTeam2),
        };

        const updatedCombat = new Combat({
            ...combat,
            team1: savedTeam1,
            team2: savedTeam2,
            history: [...combat.history, event],
            status: nextStatus ?? combat.status,
            outcome:
                nextOutcome !== undefined ? nextOutcome : combat.outcome,
            finishedAt:
                finishedAt !== undefined ? finishedAt : combat.finishedAt,
        });

        await saveCombat(updatedCombat);
        setCombat(updatedCombat);
    };

    const updateCombatant = async ({
        characterId,
        updatedCharacter,
        type,
        description,
        amount = null,
        team,
    }: {
        characterId: string;
        updatedCharacter: Character;
        type: CombatEventType;
        description: string;
        amount?: number | null;
        team: CombatTeam;
    }) => {
        if (!combat) throw new Error('Combat is not loaded.');

        const targetTeam =
            team === 'team1' ? combat.team1 : combat.team2;

        const updatedTeam = targetTeam.map((snapshot) =>
            snapshot.characterId === characterId
                ? {
                    characterId,
                    character: cloneCharacter(updatedCharacter),
                }
                : cloneSnapshot(snapshot),
        );

        const team1 =
            team === 'team1' ? updatedTeam : cloneTeam(combat.team1);
        const team2 =
            team === 'team2' ? updatedTeam : cloneTeam(combat.team2);

        await persistEvent({
            team1,
            team2,
            type,
            description,
            characterId,
            characterName: updatedCharacter.name || 'Unnamed Character',
            team,
            amount,
        });
    };

    const applyHpAction = async () => {
        if (!hpTarget || !hpAction || busy || readOnly) return;

        const amount = Number(hpAmount);

        if (
            hpAmount.trim() === '' ||
            !Number.isInteger(amount) ||
            amount < 0
        ) {
            showInfo('Invalid value', 'Enter a non-negative whole number.');
            return;
        }

        setBusy(true);

        try {
            const updatedCharacter = cloneCharacter(
                await loadCharacter(hpTarget.characterId),
            );

            if (hpAction === 'damage') {
                updatedCharacter.takeDamage(amount);
            } else if (hpAction === 'heal') {
                updatedCharacter.heal(amount);
            } else {
                updatedCharacter.setTemporaryHp(amount);
            }

            await saveCharacter(updatedCharacter, hpTarget.characterId);

            const description =
                hpAction === 'damage'
                    ? `${hpTarget.characterName} took ${amount} damage.`
                    : hpAction === 'heal'
                        ? `${hpTarget.characterName} recovered ${amount} HP.`
                        : `${hpTarget.characterName}'s temporary HP was set to ${amount}.`;

            await updateCombatant({
                characterId: hpTarget.characterId,
                updatedCharacter,
                type: hpAction === 'damage' ? 'damage' : 'healing',
                description,
                amount,
                team: hpTarget.team,
            });

            setHpTarget(null);
            setHpAction(null);
            setHpAmount('');
        } catch (err) {
            showInfo(
                'Update failed',
                err instanceof Error ? err.message : 'Could not update HP.',
            );
        } finally {
            setBusy(false);
        }
    };

    const useSpellSlot = async (
        snapshot: CombatantSnapshot,
        team: CombatTeam,
        level: number,
    ) => {
        if (busy || readOnly) return;

        const liveSlot = snapshot.character.spellSlots?.[level];

        if (!liveSlot || liveSlot.current <= 0) return;

        setBusy(true);

        try {
            const character = cloneCharacter(
                await loadCharacter(snapshot.characterId),
            );
            const slot = character.getSpellSlots(level);

            if (slot.current <= 0) {
                showInfo(
                    'No Spell Slots',
                    `No Level ${level} spell slots remain.`,
                );
                return;
            }

            slot.use();

            character.logs.push(
                `Used one Level ${level} spell slot. Remaining: ${slot.current}/${slot.maximum}.`,
            );

            await saveCharacter(character, snapshot.characterId);

            await updateCombatant({
                characterId: snapshot.characterId,
                updatedCharacter: character,
                type: 'resource_used',
                description: `${character.name} used one Level ${level} spell slot (${slot.current}/${slot.maximum} remaining).`,
                amount: 1,
                team,
            });
        } catch (err) {
            showInfo(
                'Could Not Use Spell Slot',
                err instanceof Error
                    ? err.message
                    : 'Failed to use spell slot.',
            );
        } finally {
            setBusy(false);
        }
    };

    const useResource = async (
        snapshot: CombatantSnapshot,
        team: CombatTeam,
        resourceName: string,
    ) => {
        if (busy || readOnly) return;

        const original = snapshot.character.resources.find(
            (resource) => resource.name === resourceName,
        );

        if (!original || original.current <= 0) return;

        setBusy(true);

        try {
            const character = cloneCharacter(
                await loadCharacter(snapshot.characterId),
            );
            const resource = character.resources.find(
                (item) => item.name === resourceName,
            );

            if (!resource || resource.current <= 0) {
                showInfo(
                    'No Uses Remaining',
                    `${resourceName} has no uses left.`,
                );
                return;
            }

            resource.use(1);

            character.logs.push(
                `Used one use of ${resource.name}. Current: ${resource.current}/${resource.maximum}.`,
            );

            await saveCharacter(character, snapshot.characterId);

            await updateCombatant({
                characterId: snapshot.characterId,
                updatedCharacter: character,
                type: 'resource_used',
                description: `${character.name} used ${resource.name} (${resource.current}/${resource.maximum} remaining).`,
                amount: 1,
                team,
            });
        } catch (err) {
            showInfo(
                'Cannot Use Resource',
                err instanceof Error
                    ? err.message
                    : 'Could not use this resource.',
            );
        } finally {
            setBusy(false);
        }
    };

    const openHpAction = (
        snapshot: CombatantSnapshot,
        team: CombatTeam,
        action: HpAction,
    ) => {
        if (readOnly || busy) return;

        setHpTarget({
            characterId: snapshot.characterId,
            characterName: snapshot.character.name || 'Character',
            team,
        });
        setHpAction(action);
        setHpAmount('');
    };

    const openAddModal = async (team: CombatTeam) => {
        if (readOnly || busy || !combat) return;

        setAddTeam(team);
        setAddVisible(true);
        setLoadingCandidates(true);

        try {
            const summaries = await listCharacters();
            const existingIds = new Set([
                ...combat.team1.map((item) => item.characterId),
                ...combat.team2.map((item) => item.characterId),
            ]);

            const loaded = await Promise.all(
                summaries
                    .filter((summary) => !existingIds.has(summary.id))
                    .map(async (summary) => ({
                        id: summary.id,
                        character: await loadCharacter(summary.id),
                    })),
            );

            setCandidates(loaded);
        } catch (err) {
            showInfo(
                'Could Not Load Characters',
                err instanceof Error
                    ? err.message
                    : 'Could not load available characters.',
            );
        } finally {
            setLoadingCandidates(false);
        }
    };

    const addCharacter = async (candidate: Candidate) => {
        if (!combat || busy || readOnly) return;

        const alreadyAdded = [...combat.team1, ...combat.team2].some(
            (item) => item.characterId === candidate.id,
        );

        if (alreadyAdded) {
            showInfo('Already in Combat', 'This character is already assigned to a team.');
            return;
        }

        setBusy(true);

        try {
            const snapshot: CombatantSnapshot = {
                characterId: candidate.id,
                character: cloneCharacter(candidate.character),
            };

            const team1 =
                addTeam === 'team1'
                    ? [...cloneTeam(combat.team1), snapshot]
                    : cloneTeam(combat.team1);

            const team2 =
                addTeam === 'team2'
                    ? [...cloneTeam(combat.team2), snapshot]
                    : cloneTeam(combat.team2);

            await persistEvent({
                team1,
                team2,
                type: 'other',
                description: `${candidate.character.name || 'Character'} joined Team ${addTeam === 'team1' ? '1' : '2'}.`,
                characterId: candidate.id,
                characterName: candidate.character.name || 'Unnamed Character',
                team: addTeam,
            });

            setAddVisible(false);
        } catch (err) {
            showInfo(
                'Could Not Add Character',
                err instanceof Error ? err.message : 'Could not add character.',
            );
        } finally {
            setBusy(false);
        }
    };

    const removeCharacter = async (
        snapshot: CombatantSnapshot,
        team: CombatTeam,
    ) => {
        if (!combat || busy || readOnly) return;

        setBusy(true);

        try {
            const team1 =
                team === 'team1'
                    ? combat.team1.filter(
                        (item) => item.characterId !== snapshot.characterId,
                    )
                    : cloneTeam(combat.team1);

            const team2 =
                team === 'team2'
                    ? combat.team2.filter(
                        (item) => item.characterId !== snapshot.characterId,
                    )
                    : cloneTeam(combat.team2);

            await persistEvent({
                team1,
                team2,
                type: 'other',
                description: `${snapshot.character.name || 'Character'} left Team ${team === 'team1' ? '1' : '2'}.`,
                characterId: snapshot.characterId,
                characterName: snapshot.character.name || 'Unnamed Character',
                team,
            });
        } catch (err) {
            showInfo(
                'Could Not Remove Character',
                err instanceof Error
                    ? err.message
                    : 'Could not remove character from combat.',
            );
        } finally {
            setBusy(false);
        }
    };

    const finishCombat = async (outcome: CombatOutcome) => {
        if (!combat || busy || readOnly) return;

        setBusy(true);

        try {
            const finished = new Combat({
                ...combat,
                team1: cloneTeam(combat.team1),
                team2: cloneTeam(combat.team2),
                history: [...combat.history],
            });

            finished.finish(outcome);

            await persistEvent({
                team1: finished.team1,
                team2: finished.team2,
                type: 'other',
                description: `Combat finished: ${OUTCOMES.find((item) => item.value === outcome)?.label ?? outcome}.`,
                nextStatus: 'finished',
                nextOutcome: outcome,
                finishedAt: finished.finishedAt,
            });

            setFinishVisible(false);
        } catch (err) {
            showInfo(
                'Could Not Finish Combat',
                err instanceof Error ? err.message : 'Could not finish combat.',
            );
        } finally {
            setBusy(false);
        }
    };

    const openDetails = async (characterId: string) => {
        if (busy) return;

        try {
            await setActiveCharacter(characterId);
            router.push('/dm/character');
        } catch (err) {
            showInfo(
                'Could Not Open Character',
                err instanceof Error ? err.message : 'Could not open character details.',
            );
        }
    };

    const deleteThisCombat = async () => {
        if (!combat || busy) return;

        setBusy(true);

        try {
            await deleteCombat(combat.id);
            router.replace('/combat');
        } catch (err) {
            showInfo(
                'Could Not Delete Combat',
                err instanceof Error ? err.message : 'Could not delete combat.',
            );
        } finally {
            setBusy(false);
        }
    };

    const buttonStyle = (primary = false) => [
        styles.button,
        {
            backgroundColor: primary
                ? colors.accent
                : colors.background,
            borderColor: colors.border,
            opacity: busy ? 0.55 : 1,
        },
    ];

    const buttonTextStyle = (primary = false) => [
        styles.buttonText,
        { color: primary ? (scheme === 'dark' ? '#11100F' : '#FFFFFF') : colors.text },
    ];

    const renderButton = (
        label: string,
        onPress: () => void,
        primary = false,
        disabled = false,
    ) => (
        <Pressable
            key={label}
            disabled={disabled || busy}
            onPress={onPress}
            style={[
                buttonStyle(primary),
                (disabled || busy) && styles.disabled,
            ]}
        >
            <Text style={buttonTextStyle(primary)}>{label}</Text>
        </Pressable>
    );

    const renderSection = (
        title: string,
        emptyText: string,
        children: React.ReactNode,
    ) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {title}
            </Text>
            {children ? (
                children
            ) : (
                <Text style={[styles.mutedSmall, { color: colors.textSecondary }]}>
                    {emptyText}
                </Text>
            )}
        </View>
    );

    const renderCharacterCard = (
        snapshot: CombatantSnapshot,
        team: CombatTeam,
    ) => {
        const character = snapshot.character;
        const slots = getSpellSlots(character);
        const resources = getResources(character);
        const defenses = getDefenses(character);
        const feats = character.feats ?? [];

        return (
            <View
                key={snapshot.characterId}
                style={[
                    styles.characterCard,
                    {
                        backgroundColor: colors.backgroundElement,
                        borderColor: colors.border,
                    },
                ]}
            >
                <View style={styles.identity}>
                    {character.portraitPath ? (
                        <Image
                            source={{ uri: character.portraitPath }}
                            style={styles.portrait}
                            resizeMode="cover"
                        />
                    ) : (
                        <View
                            style={[
                                styles.portraitPlaceholder,
                                { backgroundColor: colors.backgroundSelected },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.portraitInitial,
                                    { color: colors.textSecondary },
                                ]}
                            >
                                {(character.name || '?').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}

                    <View style={styles.identityText}>
                        <Text style={[styles.name, { color: colors.text }]}>
                            {character.name || 'Unnamed Character'}
                        </Text>
                        <Text style={[styles.classes, { color: colors.textSecondary }]}>
                            {getClasses(character)}
                        </Text>
                        <Text style={[styles.species, { color: colors.textSecondary }]}>
                            {character.species || 'Species not set'}
                        </Text>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    {[
                        { label: 'HP', value: `${character.currentHp}/${character.maxHp}` },
                        { label: 'Temp HP', value: String(character.temporaryHp) },
                        { label: 'AC', value: String(character.armorClass) },
                        {
                            label: 'Initiative',
                            value: character.initiative >= 0
                                ? `+${character.initiative}`
                                : String(character.initiative),
                        },
                        { label: 'Speed', value: `${character.totalSpeed} ft.` },
                    ].map((stat) => (
                        <View
                            key={stat.label}
                            style={[styles.statCell, { backgroundColor: colors.background }]}
                        >
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                {stat.label}
                            </Text>
                            <Text
                                numberOfLines={1}
                                style={[styles.statValue, { color: colors.text }]}
                            >
                                {stat.value}
                            </Text>
                        </View>
                    ))}
                </View>

                {!readOnly && (
                    <View style={styles.actionColumn}>
                        {renderButton('− Damage', () => openHpAction(snapshot, team, 'damage'))}
                        {renderButton('+ Heal', () => openHpAction(snapshot, team, 'heal'), true)}
                        {renderButton('Temp HP', () => openHpAction(snapshot, team, 'temporary'))}
                    </View>
                )}

                {renderSection(
                    'Spell Slots',
                    'No spell slots',
                    slots.length > 0 ? (
                        <View style={styles.sectionItems}>
                            {slots.map(([level, slot]) => (
                                <View
                                    key={level}
                                    style={[
                                        styles.resourceRow,
                                        { borderColor: colors.border },
                                    ]}
                                >
                                    <View style={styles.resourceInfo}>
                                        <Text style={[styles.resourceName, { color: colors.text }]}>
                                            Level {level}
                                        </Text>
                                        <Text style={[styles.mutedSmall, { color: colors.textSecondary }]}>
                                            {slot.current}/{slot.maximum} remaining
                                        </Text>
                                        <View style={styles.pipRow}>
                                            {Array.from(
                                                { length: Math.min(slot.maximum, 20) },
                                                (_, index) => (
                                                    <View
                                                        key={index}
                                                        style={{
                                                            width: 8,
                                                            height: 8,
                                                            borderRadius: 4,
                                                            borderWidth: 1,
                                                            borderColor: colors.accent,
                                                            backgroundColor:
                                                                index < slot.current
                                                                    ? colors.accent
                                                                    : 'transparent',
                                                        }}
                                                    />
                                                ),
                                            )}
                                            {slot.maximum > 20 && (
                                                <Text style={[styles.mutedSmall, { color: colors.textSecondary }]}>
                                                    +{slot.maximum - 20}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    {!readOnly && (
                                        <Pressable
                                            disabled={busy || slot.current <= 0}
                                            onPress={() =>
                                                void useSpellSlot(snapshot, team, Number(level))
                                            }
                                            style={[
                                                styles.useButton,
                                                {
                                                    backgroundColor: colors.backgroundSelected,
                                                    borderColor: colors.border,
                                                    opacity: busy || slot.current <= 0 ? 0.4 : 1,
                                                },
                                            ]}
                                        >
                                            <Text style={[styles.useButtonText, { color: colors.text }]}>
                                                Use
                                            </Text>
                                        </Pressable>
                                    )}
                                </View>
                            ))}
                        </View>
                    ) : null,
                )}

                {renderSection(
                    'Resources',
                    'No tracked resources',
                    resources.length > 0 ? (
                        <View style={styles.sectionItems}>
                            {resources.map((resource) => (
                                <View
                                    key={resource.name}
                                    style={[
                                        styles.resourceRow,
                                        { borderColor: colors.border },
                                    ]}
                                >
                                    <View style={styles.resourceInfo}>
                                        <Text style={[styles.resourceName, { color: colors.text }]}>
                                            {resource.name}
                                        </Text>
                                        <Text style={[styles.mutedSmall, { color: colors.textSecondary }]}>
                                            {resource.recovery.replaceAll('_', ' ')}
                                        </Text>
                                        <Text style={[styles.resourceCount, { color: colors.accent }]}>
                                            {resource.current}/{resource.maximum}
                                        </Text>
                                        <View
                                            style={[
                                                styles.progressTrack,
                                                { backgroundColor: colors.border },
                                            ]}
                                        >
                                            <View
                                                style={{
                                                    width: `${resource.maximum > 0
                                                            ? Math.max(
                                                                0,
                                                                Math.min(
                                                                    100,
                                                                    (resource.current / resource.maximum) * 100,
                                                                ),
                                                            )
                                                            : 0
                                                        }%`,
                                                    height: '100%',
                                                    backgroundColor: colors.accent,
                                                }}
                                            />
                                        </View>
                                    </View>
                                    {!readOnly && (
                                        <Pressable
                                            disabled={busy || resource.current <= 0}
                                            onPress={() =>
                                                void useResource(snapshot, team, resource.name)
                                            }
                                            style={[
                                                styles.useButton,
                                                {
                                                    backgroundColor: colors.backgroundSelected,
                                                    borderColor: colors.border,
                                                    opacity:
                                                        busy || resource.current <= 0 ? 0.4 : 1,
                                                },
                                            ]}
                                        >
                                            <Text style={[styles.useButtonText, { color: colors.text }]}>
                                                Use
                                            </Text>
                                        </Pressable>
                                    )}
                                </View>
                            ))}
                        </View>
                    ) : null,
                )}

                {renderSection(
                    'Feats',
                    'No feats recorded',
                    feats.length > 0 ? (
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                            {feats.join(', ')}
                        </Text>
                    ) : null,
                )}

                {renderSection(
                    'Defenses',
                    'No special defenses',
                    defenses.length > 0 ? (
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                            {defenses.join(' · ')}
                        </Text>
                    ) : null,
                )}

                {renderButton(
                    'Details →',
                    () => void openDetails(snapshot.characterId),
                    true,
                )}

                {!readOnly &&
                    renderButton(
                        'Remove from combat',
                        () => void removeCharacter(snapshot, team),
                    )}
            </View>
        );
    };

    const actionTitle =
        hpAction === 'damage'
            ? 'Take Damage'
            : hpAction === 'heal'
                ? 'Heal Character'
                : 'Set Temporary HP';

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.muted, { color: colors.textSecondary }]}>
                    Loading combat...
                </Text>
            </View>
        );
    }

    if (error || !combat) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <Text style={[styles.pageTitle, { color: colors.text }]}>
                    Could not open combat
                </Text>
                <Text style={[styles.muted, { color: colors.textSecondary }]}>
                    {error ?? 'Combat not found.'}
                </Text>
                {renderButton('Retry', () => void loadCurrentCombat(), true)}
                {renderButton('Combat History', () => router.replace('/combat'))}
            </View>
        );
    }

    return (
        <>
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Text style={[styles.eyebrow, { color: colors.accent }]}>
                        DUNGEON MASTER · COMBAT
                    </Text>
                    <Text style={[styles.pageTitle, { color: colors.text }]}>
                        {combat.name}
                    </Text>
                    <Text style={[styles.muted, { color: colors.textSecondary }]}>
                        {readOnly
                            ? `Finished · ${OUTCOMES.find((item) => item.value === combat.outcome)?.label ?? combat.outcome ?? 'No outcome recorded'}`
                            : 'Manage combat freely. No initiative order or turns are enforced.'}
                    </Text>
                </View>

                {readOnly && (
                    <View
                        style={[
                            styles.finishedBanner,
                            { borderColor: colors.border, backgroundColor: colors.backgroundElement },
                        ]}
                    >
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Combat finished
                        </Text>
                        <Text style={[styles.muted, { color: colors.textSecondary }]}>
                            This encounter is read-only. Its snapshots and event timeline are preserved.
                        </Text>
                    </View>
                )}

                <View style={styles.battleLayout}>
                    <View style={styles.teamColumn}>
                        <View
                            style={[
                                styles.teamHeader,
                                { borderColor: '#4F86D9', backgroundColor: colors.backgroundElement },
                            ]}
                        >
                            <Text style={[styles.teamTitle, { color: '#4F86D9' }]}>
                                TEAM 1
                            </Text>
                            <Text style={[styles.mutedSmall, { color: colors.textSecondary }]}>
                                {combat.team1.length} combatant(s)
                            </Text>
                            {!readOnly &&
                                renderButton('+ Add', () => void openAddModal('team1'))}
                        </View>

                        {combat.team1.length === 0 ? (
                            <Text style={[styles.mutedSmall, { color: colors.textSecondary }]}>
                                No combatants
                            </Text>
                        ) : (
                            combat.team1.map((snapshot) =>
                                renderCharacterCard(snapshot, 'team1'),
                            )
                        )}
                    </View>

                    <View style={styles.swordColumn}>
                        <Text style={styles.sword}>⚔</Text>
                    </View>

                    <View style={styles.teamColumn}>
                        <View
                            style={[
                                styles.teamHeader,
                                { borderColor: '#D98245', backgroundColor: colors.backgroundElement },
                            ]}
                        >
                            <Text style={[styles.teamTitle, { color: '#D98245' }]}>
                                TEAM 2
                            </Text>
                            <Text style={[styles.mutedSmall, { color: colors.textSecondary }]}>
                                {combat.team2.length} combatant(s)
                            </Text>
                            {!readOnly &&
                                renderButton('+ Add', () => void openAddModal('team2'))}
                        </View>

                        {combat.team2.length === 0 ? (
                            <Text style={[styles.mutedSmall, { color: colors.textSecondary }]}>
                                No combatants
                            </Text>
                        ) : (
                            combat.team2.map((snapshot) =>
                                renderCharacterCard(snapshot, 'team2'),
                            )
                        )}
                    </View>
                </View>

                {!readOnly && (
                    <View style={styles.footerActions}>
                        {renderButton('Finish Combat', () => setFinishVisible(true), true)}
                    </View>
                )}

                <View style={styles.historyHeader}>
                    <Text style={[styles.historyTitle, { color: colors.text }]}>
                        Combat History
                    </Text>
                    <Text style={[styles.mutedSmall, { color: colors.textSecondary }]}>
                        {combat.history.length} event(s)
                    </Text>
                </View>

                {combat.history.length === 0 ? (
                    <Text style={[styles.muted, { color: colors.textSecondary }]}>
                        No events recorded.
                    </Text>
                ) : (
                    [...combat.history].reverse().map((event) => (
                        <View
                            key={event.id}
                            style={[
                                styles.historyItem,
                                {
                                    backgroundColor: colors.backgroundElement,
                                    borderColor: colors.border,
                                },
                            ]}
                        >
                            <Text style={[styles.historyDescription, { color: colors.text }]}>
                                {event.description}
                            </Text>
                            <Text style={[styles.mutedSmall, { color: colors.textSecondary }]}>
                                {new Date(event.timestamp).toLocaleString()}
                            </Text>
                            <Text style={[styles.historyCheckpoint, { color: colors.textSecondary }]}>
                                Checkpoint: Team 1 ({event.team1.length}) · Team 2 ({event.team2.length})
                            </Text>
                        </View>
                    ))
                )}

                <View style={styles.footerActions}>
                    {renderButton('Back to Combats', () => router.replace('/combat'))}
                    {renderButton('Delete Combat', () => void deleteThisCombat())}
                </View>
            </ScrollView>

            {/* Damage, healing and temporary HP */}
            <Modal
                visible={hpAction !== null && hpTarget !== null}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!busy) {
                        setHpAction(null);
                        setHpTarget(null);
                    }
                }}
            >
                <View style={styles.modalOverlay}>
                    <View
                        style={[
                            styles.modalCard,
                            { backgroundColor: colors.background, borderColor: colors.border },
                        ]}
                    >
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            {actionTitle}
                        </Text>
                        <Text style={[styles.muted, { color: colors.textSecondary }]}>
                            {hpTarget?.characterName}
                        </Text>
                        <TextInput
                            value={hpAmount}
                            onChangeText={(value) => setHpAmount(value.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                            placeholder="Amount"
                            placeholderTextColor={colors.textSecondary}
                            editable={!busy}
                            autoFocus
                            style={[
                                styles.input,
                                {
                                    color: colors.text,
                                    backgroundColor: colors.backgroundElement,
                                    borderColor: colors.border,
                                },
                            ]}
                        />
                        <View style={styles.modalActions}>
                            {renderButton('Cancel', () => {
                                setHpAction(null);
                                setHpTarget(null);
                            })}
                            {renderButton(
                                busy ? 'Saving...' : 'Apply',
                                () => void applyHpAction(),
                                true,
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add a character to either team */}
            <Modal
                visible={addVisible}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!busy) setAddVisible(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View
                        style={[
                            styles.modalCard,
                            { backgroundColor: colors.background, borderColor: colors.border },
                        ]}
                    >
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            Add to Team {addTeam === 'team1' ? '1' : '2'}
                        </Text>

                        {loadingCandidates ? (
                            <ActivityIndicator size="large" color={colors.accent} />
                        ) : (
                            <ScrollView style={{ maxHeight: 420 }}>
                                {candidates.length === 0 ? (
                                    <Text style={[styles.muted, { color: colors.textSecondary }]}>
                                        No available characters. All existing characters may already be in this combat.
                                    </Text>
                                ) : (
                                    <View style={{ gap: 8 }}>
                                        {candidates.map((candidate) => (
                                            <Pressable
                                                key={candidate.id}
                                                disabled={busy}
                                                onPress={() => void addCharacter(candidate)}
                                                style={[
                                                    styles.candidateRow,
                                                    {
                                                        borderColor: colors.border,
                                                        backgroundColor: colors.backgroundElement,
                                                    },
                                                ]}
                                            >
                                                {candidate.character.portraitPath ? (
                                                    <Image
                                                        source={{ uri: candidate.character.portraitPath }}
                                                        style={styles.candidatePortrait}
                                                    />
                                                ) : (
                                                    <View
                                                        style={[
                                                            styles.candidatePortrait,
                                                            {
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                backgroundColor: colors.backgroundSelected,
                                                            },
                                                        ]}
                                                    >
                                                        <Text style={{ color: colors.text }}>
                                                            {(candidate.character.name || '?').charAt(0)}
                                                        </Text>
                                                    </View>
                                                )}
                                                <View style={{ flex: 1, gap: 3 }}>
                                                    <Text style={[styles.resourceName, { color: colors.text }]}>
                                                        {candidate.character.name || 'Unnamed Character'}
                                                    </Text>
                                                    <Text style={[styles.mutedSmall, { color: colors.textSecondary }]}>
                                                        {getClasses(candidate.character)} · {candidate.character.species || 'Species not set'}
                                                    </Text>
                                                    <Text style={[styles.mutedSmall, { color: colors.textSecondary }]}>
                                                        HP {candidate.character.currentHp}/{candidate.character.maxHp} · AC {candidate.character.armorClass}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.addSymbol, { color: colors.accent }]}>+</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </ScrollView>
                        )}

                        <View style={styles.modalActions}>
                            {renderButton('Cancel', () => setAddVisible(false))}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Finish combat and record the outcome */}
            <Modal
                visible={finishVisible}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!busy) setFinishVisible(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View
                        style={[
                            styles.modalCard,
                            { backgroundColor: colors.background, borderColor: colors.border },
                        ]}
                    >
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            Finish Combat
                        </Text>
                        <Text style={[styles.muted, { color: colors.textSecondary }]}>
                            Choose the outcome. This makes the combat read-only while preserving its full history.
                        </Text>

                        <View style={{ gap: 8 }}>
                            {OUTCOMES.map((outcome) => (
                                <Pressable
                                    key={outcome.value}
                                    disabled={busy}
                                    onPress={() => void finishCombat(outcome.value)}
                                    style={[
                                        styles.outcomeButton,
                                        {
                                            backgroundColor: colors.backgroundElement,
                                            borderColor: colors.border,
                                        },
                                    ]}
                                >
                                    <Text style={[styles.buttonText, { color: colors.text }]}>
                                        {outcome.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <View style={styles.modalActions}>
                            {renderButton('Cancel', () => setFinishVisible(false))}
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: Spacing.four,
        paddingTop: Spacing.six,
        paddingBottom: 100,
        gap: 16,
    },
    header: {
        gap: 5,
        marginBottom: 4,
    },
    eyebrow: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2,
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: '800',
    },
    muted: {
        fontSize: 13,
        lineHeight: 19,
    },
    mutedSmall: {
        fontSize: 10,
        lineHeight: 14,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 12,
    },
    battleLayout: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 5,
    },
    teamColumn: {
        flex: 1,
        minWidth: 0,
        gap: 10,
    },
    swordColumn: {
        width: 25,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 22,
    },
    sword: {
        color: '#B69A68',
        fontSize: 23,
        fontWeight: '800',
    },
    teamHeader: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 7,
        gap: 6,
    },
    teamTitle: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    characterCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 8,
        gap: 10,
    },
    identity: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    portrait: {
        width: 45,
        height: 56,
        borderRadius: 7,
        backgroundColor: '#292929',
    },
    portraitPlaceholder: {
        width: 45,
        height: 56,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    portraitInitial: {
        fontSize: 20,
        fontWeight: '800',
    },
    identityText: {
        flex: 1,
        minWidth: 0,
        gap: 3,
    },
    name: {
        fontSize: 13,
        fontWeight: '800',
    },
    classes: {
        fontSize: 10,
        lineHeight: 14,
    },
    species: {
        fontSize: 10,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    statCell: {
        width: '48%',
        flexGrow: 1,
        minWidth: 0,
        padding: 5,
        borderRadius: 6,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '600',
    },
    statValue: {
        fontSize: 12,
        fontWeight: '800',
        marginTop: 2,
    },
    actionColumn: {
        flexDirection: 'column',
        gap: 4,
    },
    button: {
        flex: 1,
        minWidth: 0,
        minHeight: 34,
        paddingHorizontal: 5,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 7,
        borderWidth: 1,
    },
    buttonText: {
        fontSize: 10,
        fontWeight: '800',
        textAlign: 'center',
    },
    section: {
        gap: 6,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
    },
    sectionItems: {
        gap: 6,
    },
    resourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        padding: 6,
        borderWidth: 1,
        borderRadius: 7,
    },
    resourceInfo: {
        flex: 1,
        minWidth: 0,
        gap: 3,
    },
    resourceName: {
        fontSize: 11,
        fontWeight: '800',
    },
    resourceCount: {
        fontSize: 10,
        fontWeight: '800',
    },
    pipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 3,
        marginTop: 2,
    },
    progressTrack: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 2,
    },
    useButton: {
        minWidth: 36,
        paddingHorizontal: 6,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        borderWidth: 1,
    },
    useButtonText: {
        fontSize: 10,
        fontWeight: '800',
    },
    detailText: {
        fontSize: 10,
        lineHeight: 14,
    },
    disabled: {
        opacity: 0.45,
    },
    footerActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    historyTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    historyItem: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 11,
        gap: 5,
    },
    historyDescription: {
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 17,
    },
    historyCheckpoint: {
        fontSize: 10,
    },
    finishedBanner: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        gap: 5,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalCard: {
        width: '100%',
        maxWidth: 550,
        maxHeight: '90%',
        padding: 18,
        gap: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    modalTitle: {
        fontSize: 19,
        fontWeight: '800',
    },
    input: {
        borderWidth: 1,
        borderRadius: 9,
        paddingHorizontal: 12,
        paddingVertical: 11,
        fontSize: 16,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 8,
    },
    candidateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 9,
        borderWidth: 1,
        borderRadius: 9,
    },
    candidatePortrait: {
        width: 42,
        height: 52,
        borderRadius: 6,
    },
    addSymbol: {
        fontSize: 23,
        fontWeight: '800',
    },
    outcomeButton: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
});

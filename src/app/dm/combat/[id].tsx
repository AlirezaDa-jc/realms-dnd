import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
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
} from '@/api/characters';

import {
    deleteCombat,
    loadCombat,
    saveCombat,
} from '@/api/combats';
import type { Character } from '@/models/character';
import {
    Combat,
    type CombatantRef,
    type CombatOutcome,
    type CombatTeam,
} from '@/models/combat';

type LoadedCombatant = CombatantRef & {
    character: Character;
};

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

/**
 * Combat stores only character IDs.
 *
 * Always hydrate characters from the character repository so their
 * latest saved state is displayed.
 */
async function loadCombatants(
    refs: CombatantRef[],
): Promise<LoadedCombatant[]> {
    return Promise.all(
        refs.map(async ({ characterId }) => ({
            characterId,
            character: await loadCharacter(characterId),
        })),
    );
}

export default function CombatScreen() {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const router = useRouter();
    const params = useLocalSearchParams<{ id: string | string[] }>();
    const { showInfo } = useDialog();

    const combatId = Array.isArray(params.id) ? params.id[0] : params.id;

    const [combat, setCombat] = useState<Combat | null>(null);
    const [team1, setTeam1] = useState<LoadedCombatant[]>([]);
    const [team2, setTeam2] = useState<LoadedCombatant[]>([]);

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

    /*
     * Reload the encounter and both teams whenever this screen receives focus.
     * Character state is never read from the Combat record.
     */
    const loadCurrentCombat = useCallback(async () => {
        if (!combatId) {
            setError('No combat ID was provided.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const loadedCombat = await loadCombat(combatId);

            const [loadedTeam1, loadedTeam2] = await Promise.all([
                loadCombatants(loadedCombat.team1),
                loadCombatants(loadedCombat.team2),
            ]);

            setCombat(loadedCombat);
            setTeam1(loadedTeam1);
            setTeam2(loadedTeam2);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not load combat.',
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

    /**
     * Update only the UI copy of the affected character.
     * The character has already been saved to the character repository.
     */
    const updateLoadedCharacter = (
        characterId: string,
        character: Character,
        team: CombatTeam,
    ) => {
        const updateTeam = (
            combatants: LoadedCombatant[],
        ): LoadedCombatant[] =>
            combatants.map((combatant) =>
                combatant.characterId === characterId
                    ? { characterId, character }
                    : combatant,
            );

        if (team === 'team1') {
            setTeam1((current) => updateTeam(current));
        } else {
            setTeam2((current) => updateTeam(current));
        }
    };

    /**
     * Apply damage, healing, or temporary HP.
     * No combat history is written.
     */
    const applyHpAction = async () => {
        if (!hpTarget || !hpAction || busy || readOnly) return;

        const amount = Number(hpAmount);

        if (
            hpAmount.trim() === '' ||
            !Number.isInteger(amount) ||
            amount < 0
        ) {
            showInfo(
                'Invalid value',
                'Enter a non-negative whole number.',
            );
            return;
        }

        setBusy(true);

        try {
            // Always load the latest saved character before changing it.
            const character = await loadCharacter(hpTarget.characterId);

            if (hpAction === 'damage') {
                character.takeDamage(amount);
            } else if (hpAction === 'heal') {
                character.heal(amount);
            } else {
                character.setTemporaryHp(amount);
            }

            // Persist character state independently of the combat record.
            await saveCharacter(character, hpTarget.characterId);

            updateLoadedCharacter(
                hpTarget.characterId,
                character,
                hpTarget.team,
            );

            setHpTarget(null);
            setHpAction(null);
            setHpAmount('');
        } catch (err) {
            showInfo(
                'Update failed',
                err instanceof Error
                    ? err.message
                    : 'Could not update HP.',
            );
        } finally {
            setBusy(false);
        }
    };

    const useSpellSlot = async (
        combatant: LoadedCombatant,
        team: CombatTeam,
        level: number,
    ) => {
        if (busy || readOnly) return;

        setBusy(true);

        try {
            const character = await loadCharacter(combatant.characterId);
            const slot = character.getSpellSlots(level);

            if (!slot || slot.current <= 0) {
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

            await saveCharacter(character, combatant.characterId);

            updateLoadedCharacter(
                combatant.characterId,
                character,
                team,
            );
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
        combatant: LoadedCombatant,
        team: CombatTeam,
        resourceName: string,
    ) => {
        if (busy || readOnly) return;

        setBusy(true);

        try {
            const character = await loadCharacter(combatant.characterId);
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

            await saveCharacter(character, combatant.characterId);

            updateLoadedCharacter(
                combatant.characterId,
                character,
                team,
            );
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
        combatant: LoadedCombatant,
        team: CombatTeam,
        action: HpAction,
    ) => {
        if (readOnly || busy) return;

        setHpTarget({
            characterId: combatant.characterId,
            characterName: combatant.character.name || 'Character',
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

        const alreadyAdded = [
            ...combat.team1,
            ...combat.team2,
        ].some((item) => item.characterId === candidate.id);

        if (alreadyAdded) {
            showInfo(
                'Already in Combat',
                'This character is already assigned to a team.',
            );
            return;
        }

        setBusy(true);

        try {
            // Reload in case the character changed while the modal was open.
            const character = await loadCharacter(candidate.id);

            const ref: CombatantRef = {
                characterId: candidate.id,
            };

            const updatedCombat = new Combat({
                ...combat,
                team1:
                    addTeam === 'team1'
                        ? [...combat.team1, ref]
                        : combat.team1,
                team2:
                    addTeam === 'team2'
                        ? [...combat.team2, ref]
                        : combat.team2,
            });

            await saveCombat(updatedCombat);

            setCombat(updatedCombat);

            const loadedCombatant: LoadedCombatant = {
                characterId: candidate.id,
                character,
            };

            if (addTeam === 'team1') {
                setTeam1((current) => [...current, loadedCombatant]);
            } else {
                setTeam2((current) => [...current, loadedCombatant]);
            }

            setAddVisible(false);
        } catch (err) {
            showInfo(
                'Could Not Add Character',
                err instanceof Error
                    ? err.message
                    : 'Could not add character.',
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
                team1: combat.team1,
                team2: combat.team2,
            });

            finished.finish(outcome);

            await saveCombat(finished);

            setCombat(finished);
            setFinishVisible(false);
        } catch (err) {
            showInfo(
                'Could Not Finish Combat',
                err instanceof Error
                    ? err.message
                    : 'Could not finish combat.',
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
                err instanceof Error
                    ? err.message
                    : 'Could not open character details.',
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
                err instanceof Error
                    ? err.message
                    : 'Could not delete combat.',
            );
        } finally {
            setBusy(false);
        }
    };

    const buttonStyle = (primary = false) => [
        styles.button,
        {
            backgroundColor: primary ? colors.accent : colors.background,
            borderColor: colors.border,
            opacity: busy ? 0.55 : 1,
        },
    ];

    const buttonTextStyle = (primary = false) => [
        styles.buttonText,
        {
            color: primary
                ? scheme === 'dark'
                    ? '#11100F'
                    : '#FFFFFF'
                : colors.text,
        },
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
        children: ReactNode,
    ) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {title}
            </Text>

            {children ? (
                children
            ) : (
                <Text
                    style={[
                        styles.mutedSmall,
                        { color: colors.textSecondary },
                    ]}
                >
                    {emptyText}
                </Text>
            )}
        </View>
    );

    const renderCharacterCard = (
        combatant: LoadedCombatant,
        team: CombatTeam,
    ) => {
        const character = combatant.character;
        const slots = getSpellSlots(character);
        const resources = getResources(character);
        const defenses = getDefenses(character);
        const weapons = character.weapons ?? [];

        return (
            <View
                key={combatant.characterId}
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
                                {
                                    backgroundColor:
                                        colors.backgroundSelected,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.portraitInitial,
                                    { color: colors.textSecondary },
                                ]}
                            >
                                {(character.name || '?')
                                    .charAt(0)
                                    .toUpperCase()}
                            </Text>
                        </View>
                    )}

                    <View style={styles.identityText}>
                        <Text
                            numberOfLines={2}
                            style={[styles.name, { color: colors.text }]}
                        >
                            {character.name || 'Unnamed Character'}
                        </Text>

                        <Text
                            style={[
                                styles.hpSummary,
                                { color: colors.textSecondary },
                            ]}
                        >
                            HP {character.currentHp}/{character.maxHp}
                            {' · '}Temp {character.temporaryHp}
                            {' · '}AC {character.armorClass}
                        </Text>
                    </View>
                </View>

                {!readOnly && (
                    <View style={styles.hpActions}>
                        {renderButton('Damage', () =>
                            openHpAction(combatant, team, 'damage'),
                        )}
                        {renderButton('Set Temp', () =>
                            openHpAction(combatant, team, 'temporary'),
                        )}
                        {renderButton(
                            'Heal',
                            () => openHpAction(combatant, team, 'heal'),
                            true,
                        )}
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
                                        <Text
                                            style={[
                                                styles.resourceName,
                                                { color: colors.text },
                                            ]}
                                        >
                                            Level {level}
                                        </Text>

                                        <Text
                                            style={[
                                                styles.resourceCount,
                                                {
                                                    color: colors.textSecondary,
                                                },
                                            ]}
                                        >
                                            {slot.current}/{slot.maximum}
                                        </Text>

                                        <View style={styles.pipRow}>
                                            {Array.from(
                                                {
                                                    length: Math.min(
                                                        slot.maximum,
                                                        20,
                                                    ),
                                                },
                                                (_, index) => (
                                                    <View
                                                        key={index}
                                                        style={{
                                                            width: 7,
                                                            height: 7,
                                                            borderRadius: 4,
                                                            borderWidth: 1,
                                                            borderColor:
                                                                colors.accent,
                                                            backgroundColor:
                                                                index <
                                                                    slot.current
                                                                    ? colors.accent
                                                                    : 'transparent',
                                                        }}
                                                    />
                                                ),
                                            )}

                                            {slot.maximum > 20 && (
                                                <Text
                                                    style={[
                                                        styles.mutedSmall,
                                                        {
                                                            color: colors.textSecondary,
                                                        },
                                                    ]}
                                                >
                                                    +{slot.maximum - 20}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {!readOnly && (
                                        <Pressable
                                            disabled={
                                                busy || slot.current <= 0
                                            }
                                            onPress={() =>
                                                void useSpellSlot(
                                                    combatant,
                                                    team,
                                                    Number(level),
                                                )
                                            }
                                            style={[
                                                styles.useButton,
                                                {
                                                    backgroundColor:
                                                        colors.backgroundSelected,
                                                    borderColor: colors.border,
                                                    opacity:
                                                        busy ||
                                                            slot.current <= 0
                                                            ? 0.4
                                                            : 1,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.useButtonText,
                                                    { color: colors.text },
                                                ]}
                                            >
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
                                        <Text
                                            style={[
                                                styles.resourceName,
                                                { color: colors.text },
                                            ]}
                                        >
                                            {resource.name}
                                        </Text>

                                        <Text
                                            style={[
                                                styles.resourceCount,
                                                {
                                                    color: colors.textSecondary,
                                                },
                                            ]}
                                        >
                                            {resource.current}/
                                            {resource.maximum}
                                        </Text>

                                        <View
                                            style={[
                                                styles.progressTrack,
                                                {
                                                    backgroundColor:
                                                        colors.border,
                                                },
                                            ]}
                                        >
                                            <View
                                                style={{
                                                    width: `${resource.maximum > 0
                                                        ? Math.max(
                                                            0,
                                                            Math.min(
                                                                100,
                                                                (resource.current /
                                                                    resource.maximum) *
                                                                100,
                                                            ),
                                                        )
                                                        : 0
                                                        }%`,
                                                    height: '100%',
                                                    backgroundColor:
                                                        colors.accent,
                                                }}
                                            />
                                        </View>
                                    </View>

                                    {!readOnly && (
                                        <Pressable
                                            disabled={
                                                busy ||
                                                resource.current <= 0
                                            }
                                            onPress={() =>
                                                void useResource(
                                                    combatant,
                                                    team,
                                                    resource.name,
                                                )
                                            }
                                            style={[
                                                styles.useButton,
                                                {
                                                    backgroundColor:
                                                        colors.backgroundSelected,
                                                    borderColor: colors.border,
                                                    opacity:
                                                        busy ||
                                                            resource.current <= 0
                                                            ? 0.4
                                                            : 1,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.useButtonText,
                                                    { color: colors.text },
                                                ]}
                                            >
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
                    'Defenses',
                    'No special defenses',
                    defenses.length > 0 ? (
                        <Text
                            style={[
                                styles.detailText,
                                { color: colors.textSecondary },
                            ]}
                        >
                            {defenses.join('\n')}
                        </Text>
                    ) : null,
                )}

                {renderSection(
                    'Weapons',
                    'No weapons equipped',
                    weapons.length > 0 ? (
                        <View style={styles.sectionItems}>
                            {weapons.map((weapon) => {
                                const attackBonus =
                                    weapon.getAttackBonus(character);
                                const damageBonus =
                                    weapon.getDamageBonus(character);

                                const damageFormula = weapon.isUnarmed
                                    ? `${Math.max(
                                        1,
                                        Number(weapon.damageDice) +
                                        damageBonus,
                                    )} ${weapon.damageType}`
                                    : damageBonus === 0
                                        ? `${weapon.damageDice} ${weapon.damageType}`
                                        : `${weapon.damageDice} ${damageBonus > 0 ? '+' : '−'
                                        } ${Math.abs(damageBonus)} ${weapon.damageType}`;

                                const properties = [
                                    weapon.isProficient
                                        ? 'Proficient'
                                        : null,
                                    weapon.isFinesse ? 'Finesse' : null,
                                    weapon.isThrown ? 'Thrown' : null,
                                    weapon.isBound ? 'Bound' : null,
                                    weapon.isUnarmed ? 'Unarmed' : null,
                                ].filter(Boolean);

                                return (
                                    <View
                                        key={weapon.id}
                                        style={[
                                            styles.weaponCard,
                                            {
                                                borderColor: colors.border,
                                                backgroundColor:
                                                    colors.background,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.weaponName,
                                                { color: colors.text },
                                            ]}
                                        >
                                            {weapon.name}
                                        </Text>

                                        <View style={styles.weaponStats}>
                                            <View
                                                style={styles.weaponAttack}
                                            >
                                                <Text
                                                    style={[
                                                        styles.mutedSmall,
                                                        {
                                                            color: colors.textSecondary,
                                                        },
                                                    ]}
                                                >
                                                    ATTACK
                                                </Text>

                                                <Text
                                                    style={[
                                                        styles.attackBonus,
                                                        { color: colors.accent },
                                                    ]}
                                                >
                                                    {attackBonus >= 0
                                                        ? '+'
                                                        : ''}
                                                    {attackBonus}
                                                </Text>
                                            </View>

                                            <View
                                                style={styles.weaponDamage}
                                            >
                                                <Text
                                                    style={[
                                                        styles.mutedSmall,
                                                        {
                                                            color: colors.textSecondary,
                                                        },
                                                    ]}
                                                >
                                                    DAMAGE
                                                </Text>

                                                <Text
                                                    style={[
                                                        styles.damageFormula,
                                                        { color: colors.text },
                                                    ]}
                                                >
                                                    {damageFormula}
                                                </Text>
                                            </View>
                                        </View>

                                        <Text
                                            style={[
                                                styles.mutedSmall,
                                                {
                                                    color: colors.textSecondary,
                                                },
                                            ]}
                                        >
                                            {weapon.attackAbility.toUpperCase()}{' '}
                                            attack
                                            {' · '}
                                            {weapon.damageAbility.toUpperCase()}{' '}
                                            damage
                                        </Text>

                                        {properties.length > 0 && (
                                            <Text
                                                style={[
                                                    styles.mutedSmall,
                                                    {
                                                        color: colors.textSecondary,
                                                    },
                                                ]}
                                            >
                                                {properties.join(' · ')}
                                            </Text>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    ) : null,
                )}

                {renderButton(
                    'Details',
                    () => void openDetails(combatant.characterId),
                    true,
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
            <View
                style={[
                    styles.centered,
                    { backgroundColor: colors.background },
                ]}
            >
                <ActivityIndicator size="large" color={colors.accent} />
                <Text
                    style={[
                        styles.muted,
                        { color: colors.textSecondary },
                    ]}
                >
                    Loading combat...
                </Text>
            </View>
        );
    }

    if (error || !combat) {
        return (
            <View
                style={[
                    styles.centered,
                    { backgroundColor: colors.background },
                ]}
            >
                <Text style={[styles.pageTitle, { color: colors.text }]}>
                    Could not open combat
                </Text>

                <Text
                    style={[
                        styles.muted,
                        { color: colors.textSecondary },
                    ]}
                >
                    {error ?? 'Combat not found.'}
                </Text>

                {renderButton(
                    'Retry',
                    () => void loadCurrentCombat(),
                    true,
                )}
                {renderButton(
                    'Back to Combats',
                    () => router.replace('/combat'),
                )}
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

                    <Text
                        style={[
                            styles.muted,
                            { color: colors.textSecondary },
                        ]}
                    >
                        {readOnly
                            ? `Finished · ${OUTCOMES.find(
                                (item) =>
                                    item.value === combat.outcome,
                            )?.label ??
                            combat.outcome ??
                            'No outcome recorded'
                            }`
                            : 'Manage combat freely. No initiative order or turns are enforced.'}
                    </Text>
                </View>

                {readOnly && (
                    <View
                        style={[
                            styles.finishedBanner,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.backgroundElement,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.sectionTitle,
                                { color: colors.text },
                            ]}
                        >
                            Combat finished
                        </Text>

                        <Text
                            style={[
                                styles.muted,
                                { color: colors.textSecondary },
                            ]}
                        >
                            This encounter is read-only. Character data
                            remains managed by the character repository.
                        </Text>
                    </View>
                )}

                <View style={styles.battleLayout}>
                    <View style={styles.teamColumn}>
                        <View
                            style={[
                                styles.teamHeader,
                                {
                                    borderColor: '#4F86D9',
                                    backgroundColor: colors.backgroundElement,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.teamTitle,
                                    { color: '#4F86D9' },
                                ]}
                            >
                                TEAM 1
                            </Text>

                            <Text
                                style={[
                                    styles.mutedSmall,
                                    { color: colors.textSecondary },
                                ]}
                            >
                                {team1.length} combatant(s)
                            </Text>

                            {!readOnly &&
                                renderButton(
                                    '+ Add',
                                    () => void openAddModal('team1'),
                                )}
                        </View>

                        {team1.length === 0 ? (
                            <Text
                                style={[
                                    styles.mutedSmall,
                                    { color: colors.textSecondary },
                                ]}
                            >
                                No combatants
                            </Text>
                        ) : (
                            team1.map((combatant) =>
                                renderCharacterCard(combatant, 'team1'),
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
                                {
                                    borderColor: '#D98245',
                                    backgroundColor: colors.backgroundElement,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.teamTitle,
                                    { color: '#D98245' },
                                ]}
                            >
                                TEAM 2
                            </Text>

                            <Text
                                style={[
                                    styles.mutedSmall,
                                    { color: colors.textSecondary },
                                ]}
                            >
                                {team2.length} combatant(s)
                            </Text>

                            {!readOnly &&
                                renderButton(
                                    '+ Add',
                                    () => void openAddModal('team2'),
                                )}
                        </View>

                        {team2.length === 0 ? (
                            <Text
                                style={[
                                    styles.mutedSmall,
                                    { color: colors.textSecondary },
                                ]}
                            >
                                No combatants
                            </Text>
                        ) : (
                            team2.map((combatant) =>
                                renderCharacterCard(combatant, 'team2'),
                            )
                        )}
                    </View>
                </View>

                {!readOnly && (
                    <View style={styles.footerActions}>
                        {renderButton(
                            'Finish Combat',
                            () => setFinishVisible(true),
                            true,
                        )}
                    </View>
                )}

                <View style={styles.footerActions}>
                    {renderButton(
                        'Back to Combats',
                        () => router.replace('/combat'),
                    )}
                    {renderButton(
                        'Delete Combat',
                        () => void deleteThisCombat(),
                    )}
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
                            {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.modalTitle,
                                { color: colors.text },
                            ]}
                        >
                            {actionTitle}
                        </Text>

                        <Text
                            style={[
                                styles.muted,
                                { color: colors.textSecondary },
                            ]}
                        >
                            {hpTarget?.characterName}
                        </Text>

                        <TextInput
                            value={hpAmount}
                            onChangeText={(value) =>
                                setHpAmount(value.replace(/[^0-9]/g, ''))
                            }
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
                            {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.modalTitle,
                                { color: colors.text },
                            ]}
                        >
                            Add to Team {addTeam === 'team1' ? '1' : '2'}
                        </Text>

                        {loadingCandidates ? (
                            <ActivityIndicator
                                size="large"
                                color={colors.accent}
                            />
                        ) : (
                            <ScrollView style={{ maxHeight: 420 }}>
                                {candidates.length === 0 ? (
                                    <Text
                                        style={[
                                            styles.muted,
                                            {
                                                color: colors.textSecondary,
                                            },
                                        ]}
                                    >
                                        No available characters. All existing
                                        characters may already be in this
                                        combat.
                                    </Text>
                                ) : (
                                    <View style={{ gap: 8 }}>
                                        {candidates.map((candidate) => (
                                            <Pressable
                                                key={candidate.id}
                                                disabled={busy}
                                                onPress={() =>
                                                    void addCharacter(candidate)
                                                }
                                                style={[
                                                    styles.candidateRow,
                                                    {
                                                        borderColor:
                                                            colors.border,
                                                        backgroundColor:
                                                            colors.backgroundElement,
                                                    },
                                                ]}
                                            >
                                                {candidate.character
                                                    .portraitPath ? (
                                                    <Image
                                                        source={{
                                                            uri: candidate
                                                                .character
                                                                .portraitPath,
                                                        }}
                                                        style={
                                                            styles.candidatePortrait
                                                        }
                                                    />
                                                ) : (
                                                    <View
                                                        style={[
                                                            styles.candidatePortrait,
                                                            {
                                                                alignItems:
                                                                    'center',
                                                                justifyContent:
                                                                    'center',
                                                                backgroundColor:
                                                                    colors.backgroundSelected,
                                                            },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={{
                                                                color: colors.text,
                                                            }}
                                                        >
                                                            {(
                                                                candidate
                                                                    .character
                                                                    .name || '?'
                                                            )
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </Text>
                                                    </View>
                                                )}

                                                <View
                                                    style={{
                                                        flex: 1,
                                                        gap: 3,
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.resourceName,
                                                            {
                                                                color: colors.text,
                                                            },
                                                        ]}
                                                    >
                                                        {candidate.character
                                                            .name ||
                                                            'Unnamed Character'}
                                                    </Text>

                                                    <Text
                                                        style={[
                                                            styles.mutedSmall,
                                                            {
                                                                color: colors.textSecondary,
                                                            },
                                                        ]}
                                                    >
                                                        {getClasses(
                                                            candidate.character,
                                                        )}
                                                        {' · '}
                                                        {candidate.character
                                                            .species ||
                                                            'Species not set'}
                                                    </Text>

                                                    <Text
                                                        style={[
                                                            styles.mutedSmall,
                                                            {
                                                                color: colors.textSecondary,
                                                            },
                                                        ]}
                                                    >
                                                        HP{' '}
                                                        {
                                                            candidate.character
                                                                .currentHp
                                                        }
                                                        /
                                                        {
                                                            candidate.character
                                                                .maxHp
                                                        }
                                                        {' · '}AC{' '}
                                                        {
                                                            candidate.character
                                                                .armorClass
                                                        }
                                                    </Text>
                                                </View>

                                                <Text
                                                    style={[
                                                        styles.addSymbol,
                                                        { color: colors.accent },
                                                    ]}
                                                >
                                                    +
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </ScrollView>
                        )}

                        <View style={styles.modalActions}>
                            {renderButton('Cancel', () =>
                                setAddVisible(false),
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Finish combat and record its outcome */}
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
                            {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.modalTitle,
                                { color: colors.text },
                            ]}
                        >
                            Finish Combat
                        </Text>

                        <Text
                            style={[
                                styles.muted,
                                { color: colors.textSecondary },
                            ]}
                        >
                            Choose the outcome. This makes the combat
                            read-only.
                        </Text>

                        <View style={{ gap: 8 }}>
                            {OUTCOMES.map((outcome) => (
                                <Pressable
                                    key={outcome.value}
                                    disabled={busy}
                                    onPress={() =>
                                        void finishCombat(outcome.value)
                                    }
                                    style={[
                                        styles.outcomeButton,
                                        {
                                            backgroundColor:
                                                colors.backgroundElement,
                                            borderColor: colors.border,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.buttonText,
                                            { color: colors.text },
                                        ]}
                                    >
                                        {outcome.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <View style={styles.modalActions}>
                            {renderButton('Cancel', () =>
                                setFinishVisible(false),
                            )}
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
        gap: 12,
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
        lineHeight: 13,
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
        gap: 8,
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
        borderRadius: 9,
        padding: 6,
        gap: 8,
    },
    identity: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    portrait: {
        width: 27,
        height: 32,
        borderRadius: 4,
        backgroundColor: '#292929',
    },
    portraitPlaceholder: {
        width: 27,
        height: 32,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    portraitInitial: {
        fontSize: 12,
        fontWeight: '800',
    },
    identityText: {
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    name: {
        fontSize: 11,
        lineHeight: 14,
        fontWeight: '800',
    },
    hpSummary: {
        fontSize: 9,
        lineHeight: 12,
    },
    hpActions: {
        flexDirection: 'row',
        gap: 3,
    },
    button: {
        flex: 1,
        minWidth: 0,
        minHeight: 30,
        paddingHorizontal: 3,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        borderWidth: 1,
    },
    buttonText: {
        fontSize: 10,
        fontWeight: '800',
        textAlign: 'center',
    },
    section: {
        gap: 5,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
    },
    sectionItems: {
        gap: 5,
    },
    resourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 5,
        borderWidth: 1,
        borderRadius: 6,
    },
    resourceInfo: {
        flex: 1,
        minWidth: 0,
        gap: 3,
    },
    resourceName: {
        fontSize: 10,
        fontWeight: '800',
    },
    resourceCount: {
        fontSize: 9,
        fontWeight: '700',
    },
    pipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 3,
        marginTop: 1,
    },
    progressTrack: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 2,
    },
    useButton: {
        minWidth: 32,
        paddingHorizontal: 5,
        paddingVertical: 5,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 5,
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
    weaponCard: {
        padding: 6,
        gap: 4,
        borderWidth: 1,
        borderRadius: 6,
    },
    weaponName: {
        fontSize: 10,
        fontWeight: '800',
    },
    weaponStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    weaponAttack: {
        flex: 1,
        minWidth: 0,
    },
    weaponDamage: {
        flex: 2,
        minWidth: 0,
    },
    attackBonus: {
        fontSize: 14,
        fontWeight: '900',
    },
    damageFormula: {
        fontSize: 10,
        fontWeight: '700',
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
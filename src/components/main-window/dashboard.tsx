import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Text,
    View,
    useColorScheme
} from 'react-native';

import { Colors } from '@/constants/theme';
import { loadActiveCharacter } from '@/database/active-character';
import { saveCharacter } from '@/database/character-repository';
import { Character } from '@/models/character';

import AbilityScores from './ability-scores';
import BonusManager, {
    type BonusOption,
} from './bonus-manager';
import ClassActions from './class-actions';
import CombatStats from './combat-stats';
import Defenses from './defenses';
import Equipment from './equipment';
import HeroSection from './hero-section';
import CharacterLogCard from './logs-card';
import NotesCard from './notes-card';
import Proficiencies from './proficiencies';
import SavingThrows from './saving-throws';
import Skills from './skills';
import SpellbookCard from './spell-book';
import SpellColumn from './spell-column';

import type { Ability } from '@/models/character';
import type { BonusCategory, CombatStat, Skill } from '@/rules/dnd5e-2024';
import type { DashboardSection } from './sidebar';

type DashboardProps = {
    onSectionLayout?: (
        section: DashboardSection,
        y: number,
    ) => void;
};

export default function Dashboard({
    onSectionLayout,
}: DashboardProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

    const [character, setCharacter] = useState<Character | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    type BonusTarget = {
        stat: string;
        title: string;
        categories: BonusOption[];
        initialCategory: BonusCategory | null;
    };

    const [bonusTarget, setBonusTarget] = useState<BonusTarget | null>(null);

    const openBonusManager = useCallback(
        (
            stat: string,
            title: string,
            categories: BonusOption[],
            initialCategory: BonusCategory | null,
        ) => {
            setBonusTarget({
                stat,
                title,
                categories,
                initialCategory,
            });
        },
        [],
    );

    const handleAddAbilityBonus = useCallback(
        (
            ability: Ability,
            category: 'ability_score' | 'ability_check' | 'saving_throw',
        ) => {
            const options: BonusOption[] = [
                { label: 'Ability Score', category: 'ability_score' },
                { label: 'Ability Check', category: 'ability_check' },
                { label: 'Saving Throw', category: 'saving_throw' },
            ];

            openBonusManager(
                ability,
                ability.toUpperCase(),
                options,
                category,
            );
        },
        [openBonusManager],
    );

    const handleAddSavingThrowBonus = useCallback(
        (ability: Ability, category: 'saving_throw') => {
            openBonusManager(
                ability,
                `${ability.toUpperCase()} Saving Throw`,
                [{ label: 'Saving Throw', category }],
                category,
            );
        },
        [openBonusManager],
    );

    const handleAddSkillBonus = useCallback(
        (skill: Skill, displayName: string) => {
            openBonusManager(
                skill,
                `${displayName} Bonus`,
                [{ label: 'Skill', category: 'skill' }],
                'skill',
            );
        },
        [openBonusManager],
    );

    const handleAddCombatBonus = useCallback(
        (stat: CombatStat, title: string) => {
            openBonusManager(
                stat,
                title,
                [{ label: 'Bonus', category: null }],
                null,
            );
        },
        [openBonusManager],
    );
    useFocusEffect(
        useCallback(() => {
            let active = true;

            async function loadCharacterFromDatabase() {
                setLoading(true);
                setError(null);

                try {
                    const loadedCharacter = await loadActiveCharacter();

                    if (active) {
                        setCharacter(loadedCharacter);
                    }
                } catch (err) {
                    if (active) {
                        setError(
                            err instanceof Error
                                ? err.message
                                : 'Failed to load character from database.',
                        );
                    }
                } finally {
                    if (active) {
                        setLoading(false);
                    }
                }
            }

            void loadCharacterFromDatabase();

            return () => {
                active = false;
            };
        }, []),
    );

    const handleChangeText = useCallback(
        async (
            field: 'ideals' | 'bonds' | 'flaws',
            value: string,
        ) => {
            if (!character) return;

            const updatedCharacter = Object.assign(
                Object.create(Object.getPrototypeOf(character)),
                character,
                { [field]: value },
            ) as Character;

            setCharacter(updatedCharacter);

            try {
                await saveCharacter(updatedCharacter);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to save character.',
                );
            }
        },
        [character],
    );

    const handleCombatUpdate = useCallback(
        async (updatedCharacter: Character) => {
            await saveCharacter(updatedCharacter);
            setCharacter(updatedCharacter);
            setError(null);
        },
        [],
    );

    const handleAddTrait = useCallback(
        async (trait: string) => {
            if (!character) return;

            const updatedCharacter = Object.assign(
                Object.create(Object.getPrototypeOf(character)),
                character,
                { traits: [...character.traits] },
            ) as Character;

            try {
                updatedCharacter.addTrait(trait);

                setCharacter(updatedCharacter);
                await saveCharacter(updatedCharacter);
            } catch (error) {
                setCharacter(character);

                Alert.alert(
                    'Could not add trait',
                    error instanceof Error
                        ? error.message
                        : 'Failed to save the trait.',
                );
            }
        },
        [character],
    );

    const handleRemoveTrait = useCallback(
        (trait: string) => {
            if (!character) return;

            Alert.alert(
                'Remove Trait',
                `Are you sure you want to remove "${trait}"?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => {
                            void (async () => {
                                const updatedCharacter = Object.assign(
                                    Object.create(
                                        Object.getPrototypeOf(character),
                                    ),
                                    character,
                                    { traits: [...character.traits] },
                                ) as Character;

                                try {
                                    updatedCharacter.removeTrait(trait);

                                    setCharacter(updatedCharacter);
                                    await saveCharacter(updatedCharacter);
                                } catch (error) {
                                    setCharacter(character);

                                    Alert.alert(
                                        'Could not remove trait',
                                        error instanceof Error
                                            ? error.message
                                            : 'Failed to save the change.',
                                    );
                                }
                            })();
                        },
                    },
                ],
            );
        },
        [character],
    );

    const handleAddCondition = useCallback(
        async (condition: string) => {
            if (!character) return;

            const updatedCharacter = Object.assign(
                Object.create(Object.getPrototypeOf(character)),
                character,
                { conditions: [...character.conditions] },
            ) as Character;

            try {
                updatedCharacter.addCondition(condition);

                setCharacter(updatedCharacter);
                await saveCharacter(updatedCharacter);
            } catch (error) {
                setCharacter(character);

                Alert.alert(
                    'Could not add condition',
                    error instanceof Error
                        ? error.message
                        : 'Failed to save the condition.',
                );
            }
        },
        [character],
    );

    const handleRemoveCondition = useCallback(
        (condition: string) => {
            if (!character) return;

            Alert.alert(
                'Remove Condition',
                `Are you sure you want to remove "${condition}"?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => {
                            void (async () => {
                                const updatedCharacter = Object.assign(
                                    Object.create(
                                        Object.getPrototypeOf(character),
                                    ),
                                    character,
                                    { conditions: [...character.conditions] },
                                ) as Character;

                                try {
                                    updatedCharacter.removeCondition(condition);

                                    setCharacter(updatedCharacter);
                                    await saveCharacter(updatedCharacter);
                                } catch (error) {
                                    setCharacter(character);

                                    Alert.alert(
                                        'Could not remove condition',
                                        error instanceof Error
                                            ? error.message
                                            : 'Failed to save the change.',
                                    );
                                }
                            })();
                        },
                    },
                ],
            );
        },
        [character],
    );

    const handleAddFeat = useCallback(
        async (feat: string) => {
            if (!character) return;

            const updatedCharacter = Object.assign(
                Object.create(Object.getPrototypeOf(character)),
                character,
                { conditions: [...character.conditions] },
            ) as Character;

            try {
                updatedCharacter.addFeat(feat);

                setCharacter(updatedCharacter);
                await saveCharacter(updatedCharacter);
            } catch (error) {
                setCharacter(character);

                Alert.alert(
                    'Could not add feat',
                    error instanceof Error
                        ? error.message
                        : 'Failed to save the feat.',
                );
            }
        },
        [character],
    );

    const handleRemoveFeat = useCallback(
        (feat: string) => {
            if (!character) return;

            Alert.alert(
                'Remove Feat',
                `Are you sure you want to remove "${feat}"?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => {
                            void (async () => {
                                const updatedCharacter = Object.assign(
                                    Object.create(
                                        Object.getPrototypeOf(character),
                                    ),
                                    character,
                                    { conditions: [...character.conditions] },
                                ) as Character;

                                try {
                                    updatedCharacter.removeFeat(feat);

                                    setCharacter(updatedCharacter);
                                    await saveCharacter(updatedCharacter);
                                } catch (error) {
                                    setCharacter(character);

                                    Alert.alert(
                                        'Could not remove feat',
                                        error instanceof Error
                                            ? error.message
                                            : 'Failed to save the change.',
                                    );
                                }
                            })();
                        },
                    },
                ],
            );
        },
        [character],
    );

    const handleUploadPortrait = useCallback(
        async (uri: string) => {
            if (!character) return;

            const updatedCharacter = Object.assign(
                Object.create(Object.getPrototypeOf(character)),
                character,
                { portraitPath: uri },
            ) as Character;

            setCharacter(updatedCharacter);

            try {
                await saveCharacter(updatedCharacter);
            } catch (error) {
                setCharacter(character);

                Alert.alert(
                    'Save failed',
                    error instanceof Error
                        ? error.message
                        : 'Could not save the portrait.',
                );
            }
        },
        [character],
    );

    if (loading) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 24,
                    backgroundColor: colors.background,
                }}
            >
                <ActivityIndicator
                    size="large"
                    color={colors.accent}
                />
            </View>
        );
    }

    if (error) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 24,
                    backgroundColor: colors.background,
                }}
            >
                <Text
                    style={{
                        color: colors.text,
                        textAlign: 'center',
                    }}
                >
                    {error}
                </Text>
            </View>
        );
    }

    if (!character) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 24,
                    backgroundColor: colors.background,
                }}
            >
                <Text
                    style={{
                        color: colors.text,
                        fontSize: 18,
                        fontWeight: '600',
                        marginBottom: 8,
                    }}
                >
                    No characters found
                </Text>

                <Text
                    style={{
                        color: colors.textSecondary,
                        textAlign: 'center',
                    }}
                >
                    Add a character to the database to display it here.
                </Text>
            </View>
        );
    }

    return (
        <View style={{ gap: 16 }}>
            <View
                onLayout={(event) =>
                    onSectionLayout?.(
                        'overview',
                        event.nativeEvent.layout.y,
                    )
                }
            >
                <View
                    onLayout={(event) =>
                        onSectionLayout?.(
                            'character',
                            event.nativeEvent.layout.y,
                        )
                    }
                >
                    <HeroSection
                        character={character}
                        onTakeRest={async (restType) => {
                            character.takeRest(restType);

                            await handleCombatUpdate(
                                Object.assign(
                                    Object.create(Object.getPrototypeOf(character)),
                                    character,
                                ) as Character,
                            );
                        }}
                        onChangeText={handleChangeText}
                        onAddFeat={handleAddFeat}
                        onRemoveFeat={handleRemoveFeat}
                        onAddCondition={handleAddCondition}
                        onRemoveCondition={handleRemoveCondition}
                        onAddTrait={handleAddTrait}
                        onRemoveTrait={handleRemoveTrait}
                        onUploadPortrait={handleUploadPortrait}
                    />
                </View>
            </View>

            <View
                onLayout={(event) =>
                    onSectionLayout?.(
                        'combat-stats',
                        event.nativeEvent.layout.y,
                    )
                }
            >
                <CombatStats
                    character={character}
                    onUpdate={handleCombatUpdate}
                    onAddBonus={handleAddCombatBonus}
                />
            </View>

            <View
                onLayout={(event) =>
                    onSectionLayout?.(
                        'spell-slots',
                        event.nativeEvent.layout.y,
                    )
                }
            >
                <SpellColumn
                    character={character}
                    onUpdate={handleCombatUpdate}
                />
            </View>

            <View
                onLayout={(event) =>
                    onSectionLayout?.(
                        'ability-scores',
                        event.nativeEvent.layout.y,
                    )
                }
            >
                <AbilityScores
                    character={character}
                    onAddBonus={handleAddAbilityBonus}
                />
            </View>

            <View
                onLayout={(event) =>
                    onSectionLayout?.(
                        'equipment',
                        event.nativeEvent.layout.y,
                    )
                }
            >
                <Equipment
                    character={character}
                    onUpdate={handleCombatUpdate}
                />
            </View>

            <View
                onLayout={(event) =>
                    onSectionLayout?.(
                        'class-actions',
                        event.nativeEvent.layout.y,
                    )
                }
            >
                <ClassActions
                    character={character}
                    onUpdate={handleCombatUpdate}
                />
            </View>

            <View
                onLayout={(event) =>
                    onSectionLayout?.(
                        'skills',
                        event.nativeEvent.layout.y,
                    )
                }
            >
                <Skills
                    character={character}
                    onUpdate={handleCombatUpdate}
                    onAddBonus={handleAddSkillBonus}
                />
            </View>

            <View
                onLayout={(event) =>
                    onSectionLayout?.(
                        'saving-throws',
                        event.nativeEvent.layout.y,
                    )
                }
            >
                <SavingThrows
                    character={character}
                    onUpdate={handleCombatUpdate}
                    onAddBonus={handleAddSavingThrowBonus}
                />
            </View>

            <View
                onLayout={(event) =>
                    onSectionLayout?.(
                        'proficiencies',
                        event.nativeEvent.layout.y,
                    )
                }
            >
                <Proficiencies
                    character={character}
                    onUpdate={handleCombatUpdate}
                />
            </View>

            <View
                onLayout={(event) =>
                    onSectionLayout?.(
                        'defenses',
                        event.nativeEvent.layout.y,
                    )
                }
            >
                <Defenses
                    character={character}
                    onUpdate={handleCombatUpdate}
                />
            </View>

            <View
                onLayout={(event) =>
                    onSectionLayout?.(
                        'spellbook',
                        event.nativeEvent.layout.y,
                    )
                }
            >
                <SpellbookCard
                    character={character}
                    onUpdate={handleCombatUpdate}
                />
            </View>

            <View
                onLayout={(event) =>
                    onSectionLayout?.(
                        'notes',
                        event.nativeEvent.layout.y,
                    )
                }
            >
                <NotesCard
                    character={character}
                    onUpdate={handleCombatUpdate}
                />
            </View>

            <View
                onLayout={(event) =>
                    onSectionLayout?.(
                        'character-log',
                        event.nativeEvent.layout.y,
                    )
                }
            >
                <CharacterLogCard character={character} />
            </View>
            {bonusTarget && (
                <BonusManager
                    visible
                    character={character}
                    stat={bonusTarget.stat}
                    title={bonusTarget.title}
                    categories={bonusTarget.categories}
                    initialCategory={bonusTarget.initialCategory}
                    onUpdate={handleCombatUpdate}
                    onClose={() => setBonusTarget(null)}
                />
            )}
        </View>
    );
}

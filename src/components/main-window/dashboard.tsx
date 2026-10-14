import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    View,
    useColorScheme,
} from 'react-native';
import CombatStats from './combat-stats';

import HeroSection from './hero-section';
import SpellColumn from './spell-column';

import { Colors } from '@/constants/theme';
import { loadActiveCharacter } from '@/database/active-character';
import { saveCharacter } from '@/database/character-repository';
import { Character } from '@/models/character';

export default function Dashboard() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

    const [character, setCharacter] = useState<Character | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                <ActivityIndicator size="large" color={colors.accent} />
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
                <Text style={{ color: colors.text, textAlign: 'center' }}>
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
        <ScrollView>
            <View style={{
                paddingBottom: 24,
            }}>
                <HeroSection
                    name={character.name}
                    species={character.species}
                    characterClass={character.characterClass}
                    level={character.level}
                    background={character.background}
                    traits={character.traits}
                    ideals={character.ideals}
                    bonds={character.bonds}
                    flaws={character.flaws}
                    onChangeText={handleChangeText}
                    onAddTrait={() => { }}
                    onRemoveTrait={() => { }}
                    onUploadPortrait={() => { }}
                />
            </View>

            <View style={{ flex: 1, minWidth: 0, gap: 16 }}>
                <SpellColumn />
            </View>
            <CombatStats
                character={character}
                onUpdate={handleCombatUpdate}
            />
        </ScrollView>
    );
}

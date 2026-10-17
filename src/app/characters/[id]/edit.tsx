import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Text,
    View,
    useColorScheme,
} from 'react-native';
import { useDialog } from '@/components/dialog/realms-dialog';
import CharacterForm, {
    type CharacterFormValues,
} from '@/components/characters/character-form';
import { Colors } from '@/constants/theme';
import { loadCharacter, saveCharacter } from '@/database/character-repository';
import type { Character } from '@/models/character';

export default function EditCharacterScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { showDialog, showInfo, showConfirm } = useDialog();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [character, setCharacter] = useState<Character | null>(null);
    const [initialValues, setInitialValues] =
        useState<Partial<CharacterFormValues> | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                if (!id || Array.isArray(id)) {
                    throw new Error('No valid character ID was provided.');
                }

                const loaded = await loadCharacter(id);

                const values: CharacterFormValues = {
                    name: loaded.name ?? '',
                    species: loaded.species ?? '',
                    classLevels: (loaded.classLevels ?? []).map((entry) => ({
                        characterClass: entry.characterClass ?? '',
                        subClass: entry.subClass ?? '',
                        level: String(entry.level ?? 1),
                    })),
                    background: loaded.background ?? '',
                    abilities: {
                        str: String(loaded.abilities.str ?? 10),
                        dex: String(loaded.abilities.dex ?? 10),
                        con: String(loaded.abilities.con ?? 10),
                        int: String(loaded.abilities.int ?? 10),
                        wis: String(loaded.abilities.wis ?? 10),
                        cha: String(loaded.abilities.cha ?? 10),
                    },
                    maxHp: String(loaded.maxHp ?? 0),
                    currentHp: String(loaded.currentHp ?? 0),
                    speed: String(loaded.speed ?? 30),
                };

                if (!cancelled) {
                    setCharacter(loaded);
                    setInitialValues(values);
                }
            } catch (error) {
                if (!cancelled) {
                    showInfo(
                        'Could not load character',
                        error instanceof Error
                            ? error.message
                            : 'Failed to load this character.',
                        [{ text: 'OK', onPress: () => router.back() }],
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void load();

        return () => {
            cancelled = true;
        };
    }, [id, router]);

    async function handleSubmit(values: CharacterFormValues) {
        if (!character || saving) return;

        setSaving(true);

        try {
            const updated = Object.assign(
                Object.create(Object.getPrototypeOf(character)),
                character,
                {
                    name: values.name.trim(),
                    species: values.species,
                    classLevels: values.classLevels.map((entry) => ({
                        ...entry,
                        level: Number(entry.level),
                    })),
                    background: values.background.trim(),
                    abilities: {
                        str: Number(values.abilities.str),
                        dex: Number(values.abilities.dex),
                        con: Number(values.abilities.con),
                        int: Number(values.abilities.int),
                        wis: Number(values.abilities.wis),
                        cha: Number(values.abilities.cha),
                    },
                    maxHp: Number(values.maxHp),
                    currentHp: Number(values.currentHp),
                    speed: Number(values.speed),
                },
            ) as Character;

            await saveCharacter(updated, character.id);

            showInfo(
                'Character Updated',
                `${updated.name} has been saved successfully.`,
                [{ text: 'OK', onPress: () => router.back() }],
            );
        } catch (error) {
            showInfo(
                'Save Failed',
                error instanceof Error
                    ? error.message
                    : 'Failed to update the character.',
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Edit Character' }} />

            {loading ? (
                <View
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: colors.background,
                    }}
                >
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text
                        style={{
                            color: colors.textSecondary,
                            marginTop: 12,
                        }}
                    >
                        Loading character...
                    </Text>
                </View>
            ) : initialValues ? (
                <CharacterForm
                    mode="edit"
                    initialValues={initialValues}
                    onSubmit={handleSubmit}
                    onCancel={() => router.back()}
                />
            ) : null}

            {saving && (
                <View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        backgroundColor: 'rgba(0,0,0,0.15)',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            )}
        </>
    );
}
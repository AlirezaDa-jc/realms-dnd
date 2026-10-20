import { useDialog } from '@/components/dialog/realms-dialog';
import { Colors, Spacing } from '@/constants/theme';
import { setActiveCharacter } from '@/database/active-character';
import {
    deleteCharacter,
    duplicateCharacter,
    listCharacters,
    loadCharacter,
    saveCharacter,
} from '@/database/character-repository';
import { characterFromJSON, characterToJSON } from '@/database/character-serializer';
import type { Character } from '@/models/character';
import { BlurView } from 'expo-blur';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, usePathname, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useColorScheme,
} from 'react-native';


type CharacterEntry = {
    id: string;
    name: string;
    character: Character;
};

export default function CharactersScreen() {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];
    const router = useRouter();
    const { showDialog, showInfo, showConfirm } = useDialog();
    const [characters, setCharacters] = useState<CharacterEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pathname = usePathname();
    const isDMMode = pathname.startsWith('/dm');
    const refreshCharacters = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const summaries = await listCharacters();

            const entries = await Promise.all(
                summaries.map(async (summary) => {
                    const character = await loadCharacter(summary.id);

                    return {
                        id: summary.id,
                        name: character.name || summary.name || 'Unnamed Character',
                        character,
                    };
                }),
            );

            setCharacters(entries);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not load characters from the database.',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            void refreshCharacters();
        }, [refreshCharacters]),
    );
    async function toggleParty(entry: CharacterEntry) {
        if (busy) return;

        setBusy(true);

        try {
            const character = await loadCharacter(entry.id);
            character.party = !character.party;

            await saveCharacter(character, entry.id);
            await refreshCharacters();

            showInfo(
                character.party ? 'Added to Party' : 'Removed from Party',
                `${character.name} was ${character.party ? 'added to' : 'removed from'
                } the party.`,
            );
        } catch (err) {
            showInfo(
                'Party Update Failed',
                err instanceof Error
                    ? err.message
                    : 'Could not update party membership.',
            );
        } finally {
            setBusy(false);
        }
    }

    async function exportCharacter(character: Character) {
        if (busy) return;
        setBusy(true);

        try {
            const data = JSON.parse(characterToJSON(character));

            if (character.portraitPath) {
                try {
                    if (Platform.OS === 'web') {
                        const response = await fetch(character.portraitPath);

                        if (response.ok) {
                            const blob = await response.blob();

                            const base64 = await new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();

                                reader.onloadend = () => {
                                    const result = reader.result;

                                    if (typeof result !== 'string') {
                                        reject(new Error('Could not read the character portrait.'));
                                        return;
                                    }

                                    resolve(result.split(',')[1] ?? '');
                                };

                                reader.onerror = () => {
                                    reject(new Error('Could not read the character portrait.'));
                                };

                                reader.readAsDataURL(blob);
                            });

                            if (base64) {
                                const extension =
                                    blob.type === 'image/png' ? 'png' :
                                        blob.type === 'image/webp' ? 'webp' :
                                            blob.type === 'image/jpeg' ? 'jpg' :
                                                'jpg';

                                data.portraitData = { base64, extension };
                            }
                        }
                    } else {
                        const portraitInfo = await FileSystem.getInfoAsync(
                            character.portraitPath
                        );

                        if (portraitInfo.exists) {
                            const base64 = await FileSystem.readAsStringAsync(
                                character.portraitPath,
                                { encoding: FileSystem.EncodingType.Base64 }
                            );

                            const extension =
                                character.portraitPath.split('.').pop()?.toLowerCase() ?? 'jpg';

                            data.portraitData = {
                                base64,
                                extension: ['jpg', 'jpeg', 'png', 'webp'].includes(extension)
                                    ? extension
                                    : 'jpg',
                            };
                        }
                    }
                } catch (portraitError) {
                    console.warn('Could not include character portrait in export:', portraitError);
                }
            }

            const json = JSON.stringify(data, null, 2);
            const filename = `${character.name.replace(/[<>:"/\\|?*]/g, '_') || 'character'}.json`;

            if (Platform.OS === 'web') {
                const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');

                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                showInfo('Export complete', `${character.name} was downloaded successfully.`);
            } else {
                if (!(await Sharing.isAvailableAsync())) {
                    showInfo('Sharing unavailable', 'Sharing is not available on this device.');
                    return;
                }

                const fileUri = `${FileSystem.cacheDirectory}${filename}`;

                await FileSystem.writeAsStringAsync(fileUri, json, {
                    encoding: FileSystem.EncodingType.UTF8,
                });

                await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/json',
                    dialogTitle: `Export ${character.name}`,
                    UTI: 'public.json',
                });
            }
        } catch (err) {
            console.error('Character export failed:', err);

            showInfo(
                'Export failed',
                err instanceof Error ? err.message : 'The character could not be exported.'
            );
        } finally {
            setBusy(false);
        }
    }

    async function importCharacter() {
        if (busy) return;

        setBusy(true);

        try {
            let json: string;

            if (Platform.OS === 'web') {
                const file = await new Promise<{
                    text: () => Promise<string>;
                } | null>((resolve) => {
                    const input = document.createElement('input');

                    input.type = 'file';
                    input.accept = '.json,application/json';

                    input.onchange = () => {
                        resolve(input.files?.[0] ?? null);
                    };

                    // Handle cancellation in browsers that support this event.
                    input.oncancel = () => resolve(null);

                    input.click();
                });

                if (!file) return;

                json = await file.text();
            } else {
                const result = await File.pickFileAsync({
                    mimeTypes: ['application/json', 'text/json'],
                });

                if (result.canceled) return;

                json = await result.result.text();
            }

            const data = JSON.parse(json);

            const portraitData = data.portraitData;
            delete data.portraitData;

            // Never reuse a path from the device that created the export.
            data.portraitPath = '';

            const imported = characterFromJSON(JSON.stringify(data));
            if (!imported || typeof imported !== 'object') {
                throw new Error(
                    'The selected file does not contain a valid character.',
                );
            }

            if (!imported.name?.trim()) {
                throw new Error('The imported character has no name.');
            }

            const id = Crypto.randomUUID();
            imported.id = id;

            if (portraitData?.base64) {
                const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

                const extension = allowedExtensions.includes(
                    portraitData.extension?.toLowerCase(),
                )
                    ? portraitData.extension.toLowerCase()
                    : 'jpg';

                if (Platform.OS === 'web') {
                    const mimeType =
                        extension === 'png'
                            ? 'image/png'
                            : extension === 'webp'
                                ? 'image/webp'
                                : extension === 'jpg' || extension === 'jpeg'
                                    ? 'image/jpeg'
                                    : 'image/jpeg';

                    imported.portraitPath =
                        `data:${mimeType};base64,${portraitData.base64}`;
                } else {
                    const portraitsDirectory =
                        `${FileSystem.documentDirectory}portraits/`;

                    await FileSystem.makeDirectoryAsync(portraitsDirectory, {
                        intermediates: true,
                    });

                    const portraitUri =
                        `${portraitsDirectory}${id}.${extension}`;

                    await FileSystem.writeAsStringAsync(
                        portraitUri,
                        portraitData.base64,
                        {
                            encoding: FileSystem.EncodingType.Base64,
                        },
                    );

                    imported.portraitPath = portraitUri;
                }
            }

            await saveCharacter(imported, id);
            await refreshCharacters();

            showInfo(
                'Import complete',
                `${imported.name} was imported successfully.`,
            );
        } catch (err) {
            console.error('Character import failed:', err);

            showInfo(
                'Import failed',
                err instanceof Error
                    ? err.message
                    : 'The selected file could not be imported.',
            );
        } finally {
            setBusy(false);
        }
    }

    function confirmDelete(entry: CharacterEntry) {
        showConfirm({
            title: 'Delete character',
            message: `Delete ${entry.character.name || 'this character'}? This cannot be undone.`,
            cancelLabel: 'Cancel',
            confirmLabel: 'Delete',
            destructive: true,
            onConfirm: async () => {
                setBusy(true);

                try {
                    await deleteCharacter(entry.id);
                    await refreshCharacters();
                } catch (err) {
                    showInfo(
                        'Delete failed',
                        err instanceof Error
                            ? err.message
                            : 'Could not delete this character.',
                    );
                } finally {
                    setBusy(false);
                }
            },
        });
    }



    async function openCharacter(id: string) {
        if (busy) return;

        setBusy(true);

        try {
            await setActiveCharacter(id);
            router.replace(isDMMode ? '/dm/character' : '/player');
        } catch (err) {
            showInfo(
                'Could not open character',
                err instanceof Error
                    ? err.message
                    : 'Failed to open this character.',
            );
        } finally {
            setBusy(false);
        }
    }

    function getCharacterClasses(character: Character) {
        const classLevels = character.classLevels ?? [];

        if (classLevels.length === 0) {
            return 'Class not set';
        }

        return classLevels
            .map(({ characterClass, subClass, level }) => {
                const className = subClass
                    ? `${subClass} ${characterClass}`
                    : characterClass;

                return `${className} ${level}`;
            })
            .join(' / ');
    }

    function getTotalLevel(character: Character) {
        return character.totalLevel;
    }

    function getSpecies(character: Character) {
        const value = character.species;
        if (!value) return 'Species not set';
        return String(value);
    }

    function editCharacter(id: string) {
        router.push({
            pathname: '/characters/[id]/edit/',
            params: {
                id, dmMode: String(isDMMode),
            },
        });
    }

    async function duplicateCharacterEntry(entry: CharacterEntry) {
        if (busy) return;

        setBusy(true);

        try {
            const newId = await duplicateCharacter(entry.id);
            await refreshCharacters();

            showDialog({
                title: 'Character Duplicated',
                message: `${entry.character.name || 'Character'} was duplicated successfully.`,
                actions: [
                    {
                        label: 'Edit Copy',
                        variant: 'primary',
                        onPress: () => editCharacter(newId),
                    },
                    {
                        label: 'OK',
                        variant: 'secondary',
                    },
                ],
            });
        } catch (err) {
            showInfo(
                'Duplicate Failed',
                err instanceof Error
                    ? err.message
                    : 'Could not duplicate this character.',
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <Text style={[styles.eyebrow, { color: colors.accent }]}>
                    YOUR ADVENTURES
                </Text>

                <Text style={[styles.title, { color: colors.text }]}>
                    Characters
                </Text>

                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Your heroes, ready for their next adventure.
                </Text>
            </View>

            <View style={styles.toolbar}>
                <Pressable
                    onPress={() => router.push({
                        pathname: '/characters/create',
                        params: {
                            dmMode: String(isDMMode),
                        },
                    })}
                    style={[
                        styles.primaryButton,
                        { backgroundColor: colors.accent },
                    ]}
                >
                    <Text style={styles.primaryButtonText}>
                        + Create Character
                    </Text>
                </Pressable>

                <Pressable
                    onPress={importCharacter}
                    disabled={busy}
                    style={[
                        styles.secondaryButton,
                        {
                            backgroundColor: colors.backgroundElement,
                            borderColor: colors.border,
                        },
                        busy && styles.disabled,
                    ]}
                >
                    <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                        {busy ? 'Working...' : 'Import JSON'}
                    </Text>
                </Pressable>
            </View>

            {
                loading ? (
                    <View style={styles.status}>
                        <ActivityIndicator color={colors.accent} />
                        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                            Loading characters...
                        </Text>
                    </View>
                ) : error ? (
                    <View
                        style={[
                            styles.emptyCard,
                            {
                                backgroundColor: colors.backgroundElement,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                            Could not load characters
                        </Text>

                        <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                            {error}
                        </Text>

                        <Pressable
                            onPress={() => void refreshCharacters()}
                            style={[styles.primaryButton, { backgroundColor: colors.accent }]}
                        >
                            <Text style={styles.primaryButtonText}>Retry</Text>
                        </Pressable>
                    </View>
                ) : characters.length === 0 ? (
                    <View
                        style={[
                            styles.emptyCard,
                            {
                                backgroundColor: colors.backgroundElement,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                            No characters yet
                        </Text>

                        <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                            Create your first hero or import a character JSON file to begin.
                        </Text>

                        <Pressable
                            onPress={() => router.push('/characters/create')}
                            style={[styles.primaryButton, { backgroundColor: colors.accent }]}
                        >
                            <Text style={styles.primaryButtonText}>
                                + Create Character
                            </Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.list}>
                        {characters.map((entry) => (
                            <BlurView
                                key={entry.id}
                                intensity={isDark ? 24 : 50}
                                tint={isDark ? 'dark' : 'light'}
                                style={[
                                    styles.characterCard,
                                    { borderColor: colors.border },
                                ]}
                            >
                                <Pressable
                                    onPress={() => void openCharacter(entry.id)}
                                    style={[
                                        styles.characterMain,
                                        {
                                            backgroundColor: colors.backgroundElement,
                                            borderColor: colors.border,
                                        },
                                    ]}
                                >
                                    <View style={styles.characterHeading}>
                                        <View style={styles.characterNameContainer}>
                                            <Text
                                                numberOfLines={2}
                                                style={[
                                                    styles.characterName,
                                                    { color: colors.text },
                                                ]}
                                            >
                                                {entry.character.name || 'Unnamed Character'}
                                            </Text>

                                            <Text
                                                style={[
                                                    styles.characterMeta,
                                                    { color: colors.textSecondary },
                                                ]}
                                            >
                                                {getSpecies(entry.character)}
                                            </Text>
                                        </View>

                                        <View
                                            style={[
                                                styles.levelBadge,
                                                { backgroundColor: colors.backgroundSelected },
                                            ]}
                                        >
                                            <Text style={[styles.levelText, { color: colors.text }]}>
                                                LV {getTotalLevel(entry.character)}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text
                                        style={[
                                            styles.classText,
                                            { color: colors.textSecondary },
                                        ]}
                                    >
                                        {getCharacterClasses(entry.character)}
                                    </Text>

                                    <Text style={[styles.openHint, { color: colors.accent }]}>
                                        Open character →
                                    </Text>
                                </Pressable>

                                <View style={styles.cardActions}>
                                    <Pressable
                                        onPress={() => void exportCharacter(entry)}
                                        style={[
                                            styles.actionButton,
                                            {
                                                backgroundColor: colors.backgroundElement,
                                                borderColor: colors.border,
                                            },
                                        ]}
                                    >
                                        <Text style={[styles.actionText, { color: colors.text }]}>
                                            Export JSON
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => editCharacter(entry.id)}
                                        style={[
                                            styles.actionButton,
                                            {
                                                backgroundColor: colors.backgroundElement,
                                                borderColor: colors.border,
                                            },
                                        ]}
                                    >
                                        <Text style={[styles.actionText, { color: colors.text }]}>
                                            Edit
                                        </Text>
                                    </Pressable>
                                </View>
                                <View style={styles.cardActions}>

                                    <Pressable
                                        onPress={() => void duplicateCharacterEntry(entry)}
                                        disabled={busy}
                                        style={[
                                            styles.actionButton,
                                            {
                                                backgroundColor: colors.backgroundElement,
                                                borderColor: colors.border,
                                            },
                                            busy && styles.disabled,
                                        ]}
                                    >
                                        <Text style={[styles.actionText, { color: colors.text }]}>
                                            Duplicate
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => confirmDelete(entry)}
                                        style={[
                                            styles.actionButton,
                                            {
                                                backgroundColor: colors.backgroundElement,
                                                borderColor: colors.border,
                                            },
                                        ]}
                                    >
                                        <Text style={[styles.actionText, { color: '#C45454' }]}>
                                            Delete
                                        </Text>
                                    </Pressable>
                                </View>
                                {isDMMode && (
                                    <View style={styles.cardActions}>
                                        <Pressable
                                            onPress={() => void toggleParty(entry)}
                                            disabled={busy}
                                            style={[
                                                styles.actionButton,
                                                {
                                                    backgroundColor: colors.backgroundElement,
                                                    borderColor: colors.border,
                                                },
                                                busy && styles.disabled,
                                            ]}
                                        >
                                            <Text style={[styles.actionText, { color: colors.accent }]}>
                                                {entry.character.party ? 'Remove from Party' : 'Add to Party'}
                                            </Text>
                                        </Pressable>
                                    </View>
                                )}
                            </BlurView>
                        ))}
                    </View>
                )
            }

            <Text style={[styles.footer, { color: colors.textSecondary }]}>
                Export a character to share its JSON file. Importing creates a separate
                entry if that character ID already exists.
            </Text>
        </ScrollView >
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: Spacing.four,
        paddingTop: Spacing.six,
        paddingBottom: Spacing.six,
    },
    header: {
        marginBottom: Spacing.four,
    },
    eyebrow: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: Spacing.two,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 15,
        marginTop: Spacing.two,
        lineHeight: 22,
    },
    toolbar: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: Spacing.four,
    },
    primaryButton: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 13,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#11100F',
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    secondaryButton: {
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 13,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '700',
    },
    disabled: {
        opacity: 0.5,
    },
    status: {
        padding: Spacing.five,
        alignItems: 'center',
        gap: 10,
    },
    statusText: {
        fontSize: 14,
    },
    emptyCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: Spacing.four,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 19,
        fontWeight: '700',
        textAlign: 'center',
    },
    emptyDescription: {
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
        marginTop: Spacing.two,
        marginBottom: Spacing.four,
    },
    list: {
        gap: 14,
    },
    characterCard: {
        borderWidth: 1,
        borderRadius: 16,
        overflow: 'hidden',
    },
    characterMain: {
        padding: 16,
        borderBottomWidth: 1,
        gap: 10,
    },
    characterHeading: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    characterNameContainer: {
        flex: 1,
        gap: 4,
    },
    characterName: {
        fontSize: 20,
        fontWeight: '700',
    },
    characterMeta: {
        fontSize: 13,
    },
    levelBadge: {
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    levelText: {
        fontSize: 12,
        fontWeight: '800',
    },
    classText: {
        fontSize: 14,
    },
    openHint: {
        fontSize: 13,
        fontWeight: '700',
        marginTop: 4,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 10,
        padding: 10,
    },
    actionButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 9,
        alignItems: 'center',
    },
    actionText: {
        fontSize: 12,
        fontWeight: '700',
    },
    footer: {
        fontSize: 12,
        lineHeight: 18,
        marginTop: Spacing.four,
        textAlign: 'center',
    },
});

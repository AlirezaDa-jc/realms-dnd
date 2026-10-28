import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useDialog } from '@/components/dialog/realms-dialog';
import CharacterForm, {
    type CharacterFormValues,
} from '@/components/characters/character-form';

import { createCharacter } from '@/api/characters';
import { Character } from '@/models/character';

export default function CreateCharacterScreen() {
    const { dmMode: dmModeParam } = useLocalSearchParams<{
        dmMode?: string;
    }>();

    const dmMode = dmModeParam === 'true';
    const router = useRouter();
    const { showDialog, showInfo } = useDialog();

    async function handleSubmit(values: CharacterFormValues) {
        try {
            const character = new Character({
                name: values.name,
                species: values.species,
                classLevels: values.classLevels.map((entry) => ({
                    characterClass: entry.characterClass,
                    subClass: entry.subClass.trim(),
                    level: Number(entry.level),
                })),
                background: values.background,
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

                // DM details
                category: values.category.trim(),
                challengeRating: values.challengeRating,
                encounterRole: values.encounterRole.trim(),
            });

            // Save to the shared backend database.
            await createCharacter(character);

            showDialog({
                title: 'Character Created',
                message: `${character.name} has been saved successfully.`,
                actions: [
                    {
                        label: 'OK',
                        variant: 'primary',
                        onPress: () => router.back(),
                    },
                ],
            });
        } catch (error) {
            showInfo(
                'Save Failed',
                error instanceof Error
                    ? error.message
                    : 'Failed to save the character to the server.',
            );
        }
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Create Character' }} />

            <CharacterForm
                mode="create"
                onSubmit={handleSubmit}
                onCancel={() => router.back()}
                dmMode={dmMode}
            />
        </>
    );
}

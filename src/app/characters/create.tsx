import { Stack, useRouter } from 'expo-router';
import { Alert } from 'react-native';

import CharacterForm, {
    type CharacterFormValues,
} from '@/components/characters/character-form';

import { saveCharacter } from '@/database/character-repository';
import { Character } from '@/models/character';

export default function CreateCharacterScreen() {
    const router = useRouter();

    async function handleSubmit(values: CharacterFormValues) {
        try {
            const character = new Character({
                name: values.name,
                species: values.species,
                characterClass: values.characterClass,
                subClass: values.subClass,
                level: Number(values.level),
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
            });

            await saveCharacter(character);

            Alert.alert(
                'Character Created',
                `${character.name} has been saved successfully.`,
                [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ],
            );
        } catch (error) {
            Alert.alert(
                'Save Failed',
                error instanceof Error
                    ? error.message
                    : 'Failed to save the character to the database.',
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
            />
        </>
    );
}

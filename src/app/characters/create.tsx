import { Stack, useRouter } from 'expo-router';
import { Alert } from 'react-native';

import CharacterForm, {
    type CharacterFormValues,
} from '@/components/characters/character-form';

export default function CreateCharacterScreen() {
    const router = useRouter();

    function handleSubmit(values: CharacterFormValues) {
        // Temporary until local character storage is implemented.
        Alert.alert(
            'Form Valid',
            `${values.name} is ready to be saved. Storage is not connected yet.`,
        );
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
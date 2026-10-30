import { Stack } from 'expo-router';

export default function CombatLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="create"
                options={{ title: 'Create Combat' }}
            />
            <Stack.Screen
                name="index"
                options={{ title: 'Combat' }}
            />
            <Stack.Screen
                name="[id]"
                options={{ title: 'Combat Details' }}
            />
        </Stack>
    );
}
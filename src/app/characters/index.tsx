import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';

export default function CharactersScreen() {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const router = useRouter();
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.eyebrow, { color: colors.accent }]}>
                    YOUR ADVENTURES
                </Text>
                <Text style={[styles.title, { color: colors.text }]}>Characters</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Your heroes, ready for their next adventure.
                </Text>
            </View>

            <View
                style={[
                    styles.emptyCard,
                    {
                        backgroundColor: colors.backgroundElement,
                        borderColor: colors.border,
                    },
                ]}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    No characters yet
                </Text>
                <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                    Create your first hero and begin your journey through the realms.
                </Text>

                <Pressable
                    onPress={() => router.push('/characters/create')}
                    style={[styles.button, { backgroundColor: colors.accent }]}>
                    <Text style={styles.buttonText}>+ Create Character</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: Spacing.four,
        paddingTop: Spacing.six,
    },
    header: {
        marginBottom: Spacing.five,
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
    button: {
        width: '100%',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
    },
    buttonText: {
        color: '#11100F',
        fontSize: 15,
        fontWeight: '700',
    },
});
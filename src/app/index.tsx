import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
    useColorScheme,
} from 'react-native';

import { Colors } from '@/constants/theme';

export default function IndexScreen() {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: colors.background },
            ]}
        >
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

            <View style={styles.header}>
                <Text style={[styles.eyebrow, { color: colors.accent }]}>
                    DUNGEONS & DRAGONS · 2024
                </Text>

                <Text style={[styles.title, { color: colors.text }]}>
                    REALMS
                </Text>

                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Choose your mode
                </Text>
            </View>

            <View style={styles.options}>
                <Pressable
                    accessibilityRole="button"
                    onPress={() => router.replace('/player')}
                    style={({ pressed }) => [
                        styles.card,
                        {
                            backgroundColor: colors.backgroundElement,
                            borderColor: colors.border,
                            opacity: pressed ? 0.75 : 1,
                        },
                    ]}
                >
                    <Text style={[styles.symbol, { color: colors.accent }]}>
                        ⚔
                    </Text>

                    <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>
                            Player
                        </Text>

                        <Text
                            style={[
                                styles.description,
                                { color: colors.textSecondary },
                            ]}
                        >
                            Manage your characters, abilities, equipment, spells, and resources.
                        </Text>
                    </View>

                    <Text style={[styles.arrow, { color: colors.accent }]}>
                        ›
                    </Text>
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    onPress={() => router.replace('/dm')}
                    style={({ pressed }) => [
                        styles.card,
                        {
                            backgroundColor: colors.backgroundElement,
                            borderColor: colors.border,
                            opacity: pressed ? 0.75 : 1,
                        },
                    ]}
                >
                    <Text style={[styles.symbol, { color: colors.accent }]}>
                        ♜
                    </Text>

                    <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>
                            Dungeon Master
                        </Text>

                        <Text
                            style={[
                                styles.description,
                                { color: colors.textSecondary },
                            ]}
                        >
                            Manage your party, combat, characters, and NPCs.
                        </Text>
                    </View>

                    <Text style={[styles.arrow, { color: colors.accent }]}>
                        ›
                    </Text>
                </Pressable>
            </View>

            <Text style={[styles.footer, { color: colors.textSecondary }]}>
                Your world. Your characters. Your story.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 44,
    },
    eyebrow: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 3,
        marginBottom: 12,
    },
    title: {
        fontSize: 42,
        fontWeight: '900',
        letterSpacing: 7,
    },
    subtitle: {
        fontSize: 15,
        marginTop: 10,
    },
    options: {
        width: '100%',
        maxWidth: 520,
        alignSelf: 'center',
        gap: 16,
    },
    card: {
        minHeight: 126,
        borderWidth: 1,
        borderRadius: 14,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    symbol: {
        fontSize: 34,
        width: 42,
        textAlign: 'center',
    },
    cardContent: {
        flex: 1,
        gap: 8,
    },
    cardTitle: {
        fontSize: 19,
        fontWeight: '700',
    },
    description: {
        fontSize: 13,
        lineHeight: 19,
    },
    arrow: {
        fontSize: 30,
        fontWeight: '300',
    },
    footer: {
        textAlign: 'center',
        fontSize: 12,
        marginTop: 36,
    },
});
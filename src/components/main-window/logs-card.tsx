import { Colors } from '@/constants/theme';
import type { Character } from '@/models/character';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    Text,
    useColorScheme,
    View,
} from 'react-native';

type CharacterLogCardProps = {
    character: Character;
};

export default function CharacterLogCard({
    character,
}: CharacterLogCardProps) {
    const scheme = useColorScheme() ?? 'light';
    const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
    const [visible, setVisible] = useState(false);

    const logs = [...character.logs].reverse();

    return (
        <>
            <BlurView
                intensity={scheme === 'dark' ? 35 : 65}
                tint={scheme}
                style={{
                    padding: 16,
                    borderRadius: 18,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: colors.border,
                    gap: 12,
                    marginTop: 16,
                }}
            >
                <Text
                    style={{
                        color: colors.text,
                        fontSize: 16,
                        fontWeight: '700',
                        letterSpacing: 0.5,
                    }}
                >
                    CHARACTER LOG
                </Text>

                <Text
                    style={{
                        color: colors.textSecondary,
                        fontSize: 12,
                        lineHeight: 18,
                    }}
                >
                    Review events recorded during your adventures before each
                    long rest.
                </Text>

                <Pressable
                    onPress={() => setVisible(true)}
                    style={{
                        backgroundColor: colors.backgroundElement,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 9,
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        alignItems: 'center',
                    }}
                >
                    <Text
                        style={{
                            color: colors.text,
                            fontSize: 13,
                            fontWeight: '600',
                        }}
                    >
                        View Character Log
                    </Text>
                </Pressable>
            </BlurView>

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 20,
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 650,
                            height: '75%',
                            backgroundColor: colors.background,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 18,
                            overflow: 'hidden',
                        }}
                    >
                        <View
                            style={{
                                padding: 18,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <View style={{ flex: 1, gap: 4 }}>
                                <Text
                                    style={{
                                        color: colors.text,
                                        fontSize: 18,
                                        fontWeight: '700',
                                    }}
                                >
                                    Character Log
                                </Text>

                                <Text
                                    style={{
                                        color: colors.textSecondary,
                                        fontSize: 12,
                                    }}
                                >
                                    {logs.length}{' '}
                                    {logs.length === 1 ? 'event' : 'events'} recorded
                                </Text>
                            </View>

                            <Pressable
                                onPress={() => setVisible(false)}
                                hitSlop={10}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 8,
                                    backgroundColor: colors.backgroundElement,
                                }}
                            >
                                <Text
                                    style={{
                                        color: colors.text,
                                        fontSize: 13,
                                        fontWeight: '600',
                                    }}
                                >
                                    Close
                                </Text>
                            </Pressable>
                        </View>

                        <ScrollView
                            contentContainerStyle={{
                                padding: 16,
                                flexGrow: 1,
                                gap: 10,
                            }}
                        >
                            {logs.length > 0 ? (
                                logs.map((entry, index) => (
                                    <View
                                        key={`${entry} -${index} `}
                                        style={{
                                            backgroundColor: colors.backgroundElement,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            borderRadius: 10,
                                            padding: 12,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: colors.text,
                                                fontSize: 13,
                                                lineHeight: 20,
                                            }}
                                        >
                                            {entry}
                                        </Text>
                                    </View>
                                ))
                            ) : (
                                <View
                                    style={{
                                        flex: 1,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        padding: 24,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: colors.textSecondary,
                                            fontSize: 14,
                                            textAlign: 'center',
                                        }}
                                    >
                                        No events recorded yet.
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
}

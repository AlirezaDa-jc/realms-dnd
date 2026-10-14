import { Colors } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { Pressable, Text, useColorScheme, View } from 'react-native';

type SpellSlotsCardProps = {
    slots?: { level: number; total: number; used: number }[];
    onEditSlots?: () => void;
    onRecoverSlots?: () => void;
};

export default function SpellSlotsCard({
    slots = [],
    onEditSlots,
    onRecoverSlots,
}: SpellSlotsCardProps) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    return (
        <BlurView
            intensity={scheme === 'dark' ? 35 : 55}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={{
                borderRadius: 18,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
            }}
        >
            <View style={{ padding: 18, gap: 16 }}>
                <Text
                    style={{
                        color: colors.accent,
                        fontSize: 11,
                        fontWeight: '800',
                        letterSpacing: 2,
                    }}
                >
                    SPELL SLOTS
                </Text>

                {slots.length === 0 ? (
                    <Text
                        style={{
                            color: colors.textSecondary,
                            fontSize: 13,
                        }}
                    >
                        No spell slots available.
                    </Text>
                ) : (
                    <View style={{ gap: 12 }}>
                        {slots.map((slot) => (
                            <View
                                key={slot.level}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                }}
                            >
                                <Text
                                    style={{
                                        color: colors.text,
                                        fontSize: 13,
                                        fontWeight: '600',
                                    }}
                                >
                                    Level {slot.level}
                                </Text>

                                <View
                                    style={{
                                        flexDirection: 'row',
                                        gap: 6,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    {Array.from(
                                        { length: Math.max(0, slot.total) },
                                        (_, index) => (
                                            <View
                                                key={index}
                                                style={{
                                                    width: 17,
                                                    height: 17,
                                                    borderRadius: 9,
                                                    borderWidth: 1,
                                                    borderColor: colors.accent,
                                                    backgroundColor:
                                                        index < slot.used
                                                            ? 'transparent'
                                                            : colors.accent,
                                                }}
                                            />
                                        ),
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <View
                    style={{
                        height: 1,
                        backgroundColor: colors.border,
                    }}
                />

                <View style={{ gap: 8 }}>
                    <ActionButton
                        label="+ Edit Spell Slots"
                        onPress={onEditSlots}
                        colors={colors}
                    />
                    <ActionButton
                        label="Recover Spell Slots"
                        onPress={onRecoverSlots}
                        colors={colors}
                    />
                </View>
            </View>
        </BlurView>
    );
}

function ActionButton({
    label,
    onPress,
    colors,
}: {
    label: string;
    onPress?: () => void;
    colors: (typeof Colors)['light'];
}) {
    return (
        <Pressable
            onPress={onPress}
            style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                alignItems: 'center',
                borderRadius: 9,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.backgroundSelected,
            }}
        >
            <Text
                style={{
                    color: colors.text,
                    fontSize: 12,
                    fontWeight: '700',
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}
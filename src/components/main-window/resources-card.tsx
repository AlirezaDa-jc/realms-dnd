import { Colors } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { Pressable, Text, useColorScheme, View } from 'react-native';

export type ResourceItem = {
    id: string;
    name: string;
    current: number;
    maximum: number;
};

type ResourcesCardProps = {
    resources?: ResourceItem[];
    onAddResource?: () => void;
    onEditResources?: () => void;
    onRecoverResources?: () => void;
};

export default function ResourcesCard({
    resources = [],
    onAddResource,
    onEditResources,
    onRecoverResources,
}: ResourcesCardProps) {
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
                    RESOURCES
                </Text>

                {resources.length === 0 ? (
                    <Text
                        style={{
                            color: colors.textSecondary,
                            fontSize: 13,
                        }}
                    >
                        No resources added yet.
                    </Text>
                ) : (
                    <View style={{ gap: 10 }}>
                        {resources.map((resource) => (
                            <View
                                key={resource.id}
                                style={{
                                    padding: 12,
                                    gap: 8,
                                    borderRadius: 10,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: 'rgba(128,128,128,0.06)',
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        gap: 8,
                                    }}
                                >
                                    <Text
                                        style={{
                                            flex: 1,
                                            color: colors.text,
                                            fontSize: 13,
                                            fontWeight: '700',
                                        }}
                                    >
                                        {resource.name}
                                    </Text>

                                    <Text
                                        style={{
                                            color: colors.accent,
                                            fontSize: 12,
                                            fontWeight: '700',
                                        }}
                                    >
                                        {resource.current}/{resource.maximum}
                                    </Text>
                                </View>

                                <View
                                    style={{
                                        height: 6,
                                        borderRadius: 3,
                                        overflow: 'hidden',
                                        backgroundColor: colors.border,
                                    }}
                                >
                                    <View
                                        style={{
                                            height: '100%',
                                            width: `${resource.maximum > 0
                                                    ? Math.min(
                                                        100,
                                                        Math.max(
                                                            0,
                                                            (resource.current /
                                                                resource.maximum) *
                                                            100,
                                                        ),
                                                    )
                                                    : 0
                                                }%`,
                                            backgroundColor: colors.accent,
                                        }}
                                    />
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
                        label="+ Add Resource"
                        onPress={onAddResource}
                        colors={colors}
                    />
                    <ActionButton
                        label="Edit Resources"
                        onPress={onEditResources}
                        colors={colors}
                    />
                    <ActionButton
                        label="Recover Resources"
                        onPress={onRecoverResources}
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
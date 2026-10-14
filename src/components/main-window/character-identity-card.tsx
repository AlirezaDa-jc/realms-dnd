import { Image, useWindowDimensions } from 'react-native';
import { Colors } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import {
    Pressable,
    Text,
    TextInput,
    useColorScheme,
    View
} from 'react-native';

type CharacterIdentityCardProps = {
    name: string;
    species: string;
    characterClass: string;
    level: number;
    background: string;
    traits: string[];
    ideals: string;
    bonds: string;
    flaws: string;
    onChangeText: (field: 'ideals' | 'bonds' | 'flaws', value: string) => void;
    onAddTrait: () => void;
    onRemoveTrait: (trait: string) => void;
    portraitUri?: string | null;
    onUploadPortrait: () => void;
    horizontal?: boolean;
};

export default function CharacterIdentityCard({
    name,
    species,
    characterClass,
    level,
    background,
    traits,
    ideals,
    bonds,
    flaws,
    onChangeText,
    onAddTrait,
    onRemoveTrait,
    portraitUri,
    onUploadPortrait,
    horizontal = true,
}: CharacterIdentityCardProps) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [expandedTraits, setExpandedTraits] = useState(true);

    function renderTextField(
        label: string,
        field: 'ideals' | 'bonds' | 'flaws',
        value: string,
        placeholder: string,
    ) {
        return (
            <View style={{ gap: 6 }}>
                <Text
                    style={{
                        color: colors.textSecondary,
                        fontSize: 11,
                        fontWeight: '800',
                        letterSpacing: 1.5,
                    }}
                >
                    {label}
                </Text>

                <TextInput
                    value={value}
                    onChangeText={(text) => onChangeText(field, text)}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    textAlignVertical="top"
                    style={{
                        minHeight: 68,
                        padding: 11,
                        color: colors.text,
                        backgroundColor:
                            scheme === 'dark'
                                ? 'rgba(255,255,255,0.035)'
                                : 'rgba(255,255,255,0.35)',
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 10,
                        fontSize: 13,
                        lineHeight: 19,
                    }}
                />
            </View>
        );
    }

    return (
        <BlurView
            intensity={scheme === 'dark' ? 35 : 55}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={{
                flex: 1,
                minWidth: 0,
                borderRadius: 18,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor:
                    scheme === 'dark'
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(139,100,44,0.18)',
            }}
        >
            <View style={{ padding: 20, gap: 18 }}>
                <Text
                    style={{
                        color: colors.accent,
                        fontSize: 11,
                        fontWeight: '800',
                        letterSpacing: 2,
                    }}
                >
                    CHARACTER
                </Text>

                <View style={{ gap: 5 }}>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            gap: 16,
                            width: '100%',
                        }}
                    >
                        {/* Left: Portrait */}
                        <View
                            style={{
                                width: 110,
                                flexShrink: 0,
                                gap: 8,
                            }}
                        >
                            <View
                                style={{
                                    width: '100%',
                                    aspectRatio: 3 / 4,
                                    borderRadius: 12,
                                    overflow: 'hidden',
                                    backgroundColor:
                                        scheme === 'dark' ? '#252C37' : '#E8DFD0',
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {portraitUri ? (
                                    <Image
                                        source={{ uri: portraitUri }}
                                        resizeMode="cover"
                                        style={{ width: '100%', height: '100%' }}
                                    />
                                ) : (
                                    <Text
                                        style={{
                                            color: colors.textSecondary,
                                            fontSize: 10,
                                        }}
                                    >
                                        NO PORTRAIT
                                    </Text>
                                )}
                            </View>

                            <Pressable
                                onPress={onUploadPortrait}
                                style={{
                                    padding: 8,
                                    alignItems: 'center',
                                    borderRadius: 9,
                                    backgroundColor: colors.backgroundSelected,
                                }}
                            >
                                <Text
                                    style={{
                                        color: colors.text,
                                        fontWeight: '700',
                                        fontSize: 11,
                                    }}
                                >
                                    Upload
                                </Text>
                            </Pressable>
                        </View>

                        {/* Right: Character identity */}
                        <View
                            style={{
                                flex: 1,
                            }}
                        >
                            <View
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    gap: 8,
                                }}
                            >
                                <Text
                                    style={{
                                        color: colors.text,
                                        fontSize: 27,
                                        fontWeight: '800',
                                    }}
                                >
                                    {name || 'Unnamed Hero'}
                                </Text>

                                <Text
                                    style={{
                                        color: colors.textSecondary,
                                        fontSize: 14,
                                    }}
                                >
                                    {species || 'Unknown Species'}
                                    {'  ·  '}
                                    {characterClass || 'Unknown Class'}
                                </Text>
                            </View>

                            <View
                                style={{
                                    flexDirection: 'row',
                                    gap: 12,
                                }}
                            >
                                <View
                                    style={{
                                        flex: 1,
                                        padding: 14,
                                        borderRadius: 12,
                                        backgroundColor:
                                            scheme === 'dark'
                                                ? 'rgba(214,173,96,0.10)'
                                                : 'rgba(139,100,44,0.08)',
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: colors.textSecondary,
                                            fontSize: 10,
                                            fontWeight: '800',
                                            letterSpacing: 1.5,
                                        }}
                                    >
                                        LEVEL
                                    </Text>
                                    <Text
                                        style={{
                                            color: colors.accent,
                                            fontSize: 30,
                                            fontWeight: '800',
                                            marginTop: 4,
                                        }}
                                    >
                                        {String(level).padStart(2, '0')}
                                    </Text>
                                </View>
                                <View
                                    style={{
                                        flex: 2,
                                        padding: 14,
                                        borderRadius: 12,
                                        backgroundColor: 'rgba(128,128,128,0.06)',
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        justifyContent: 'center',
                                        gap: 5,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: colors.textSecondary,
                                            fontSize: 10,
                                            fontWeight: '800',
                                            letterSpacing: 1.5,
                                        }}
                                    >
                                        BACKGROUND
                                    </Text>
                                    <Text
                                        style={{
                                            color: colors.text,
                                            fontSize: 15,
                                            fontWeight: '600',
                                        }}
                                    >
                                        {background || 'Not selected'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>





                <View style={{ gap: 12 }}>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Pressable
                            onPress={() => setExpandedTraits((value) => !value)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                        >
                            <Text style={{ color: colors.text, fontWeight: '800' }}>
                                TRAITS
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                {expandedTraits ? '⌃' : '⌄'}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={onAddTrait}
                            style={{
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                                borderRadius: 8,
                                backgroundColor: colors.backgroundSelected,
                            }}
                        >
                            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>
                                + Add
                            </Text>
                        </Pressable>
                    </View>

                    {expandedTraits && (
                        <View style={{ gap: 7 }}>
                            {traits.length === 0 ? (
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                    No traits added yet.
                                </Text>
                            ) : (
                                traits.map((trait, index) => (
                                    <View
                                        key={`${trait}-${index}`}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: 10,
                                            borderRadius: 9,
                                            backgroundColor: 'rgba(128,128,128,0.06)',
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: 3,
                                                backgroundColor: colors.accent,
                                            }}
                                        />
                                        <Text style={{ color: colors.text, flex: 1, fontSize: 13 }}>
                                            {trait}
                                        </Text>
                                        <Pressable
                                            onPress={() => onRemoveTrait(trait)}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Remove ${trait}`}
                                        >
                                            <Text style={{ color: colors.textSecondary, fontSize: 17 }}>
                                                ×
                                            </Text>
                                        </Pressable>
                                    </View>
                                ))
                            )}
                        </View>
                    )}
                </View>

                <View
                    style={{
                        height: 1,
                        backgroundColor: colors.border,
                    }}
                />

                {renderTextField(
                    'IDEALS',
                    'ideals',
                    ideals,
                    'What principles guide your character?',
                )}

                {renderTextField(
                    'BONDS',
                    'bonds',
                    bonds,
                    'What matters most to your character?',
                )}

                {renderTextField(
                    'FLAWS',
                    'flaws',
                    flaws,
                    'What weaknesses does your character have?',
                )}
            </View>
        </BlurView>
    );
}

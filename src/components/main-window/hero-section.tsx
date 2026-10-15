
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/theme';
import { RecoveryType } from '@/models/resource';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    Pressable,
    Text,
    TextInput,
    useColorScheme,
    View,
} from 'react-native';

type HeroSectionProps = {
    name: string;
    species: string;
    characterClass: string;
    subClass: string;
    level: number;
    background: string;
    traits: string[];
    ideals: string;
    bonds: string;
    flaws: string;
    onChangeText: (field: 'ideals' | 'bonds' | 'flaws', value: string) => void;
    onAddTrait: (trait: string) => void;
    onRemoveTrait: (trait: string) => void;
    portraitPath?: string | null;
    onUploadPortrait: (uri: string) => void | Promise<void>;
    onTakeRest: (restType: RecoveryType) => void | Promise<void>;
    horizontal?: boolean;
};

export default function HeroSection({
    name,
    species,
    characterClass,
    subClass,
    level,
    background,
    traits,
    ideals,
    bonds,
    flaws,
    onChangeText,
    onAddTrait,
    onRemoveTrait,
    portraitPath,
    onUploadPortrait,
    onTakeRest,
    horizontal = true,
}: HeroSectionProps) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [expandedTraits, setExpandedTraits] = useState(true);
    const [traitModalVisible, setTraitModalVisible] = useState(false);
    const [newTrait, setNewTrait] = useState('');

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


    async function handleUploadPortrait() {
        try {
            const permission =
                await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                Alert.alert(
                    'Permission required',
                    'Allow access to your photo library to choose a portrait.',
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [3, 4],
                quality: 0.8,
            });

            if (result.canceled || !result.assets[0]?.uri) {
                return;
            }

            await onUploadPortrait(result.assets[0].uri);
        } catch (error) {
            Alert.alert(
                'Upload failed',
                error instanceof Error
                    ? error.message
                    : 'Could not select the portrait.',
            );
        }
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
                                    aspectRatio: 3 / 7,
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
                                {portraitPath ? (
                                    <Image
                                        source={{ uri: portraitPath }}
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
                                onPress={() => void handleUploadPortrait()}
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
                                </Text>

                                <Text
                                    style={{
                                        color: colors.textSecondary,
                                        fontSize: 14,
                                    }}
                                >
                                    {characterClass || 'Unknown Class'}
                                </Text>

                                {subClass && <Text
                                    style={{
                                        color: colors.textSecondary,
                                        fontSize: 14,
                                    }}
                                >
                                    {subClass}
                                </Text>}
                            </View>

                            <View
                                style={{
                                    flexDirection: 'column',
                                    gap: 12,
                                    marginTop: 18
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
                            onPress={() => {
                                setNewTrait('');
                                setTraitModalVisible(true);
                            }}
                            style={{
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                                borderRadius: 8,
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
                <View
                    style={{
                        height: 1,
                        backgroundColor: colors.border,
                    }}
                />

                <View style={{ gap: 12 }}>
                    <View style={{ gap: 4 }}>
                        <Text
                            style={{
                                color: colors.text,
                                fontSize: 14,
                                fontWeight: '800',
                                letterSpacing: 1,
                            }}
                        >
                            TAKE A REST
                        </Text>

                        <Text
                            style={{
                                color: colors.textSecondary,
                                fontSize: 12,
                                lineHeight: 18,
                            }}
                        >
                            Recover and prepare for your next adventure.
                        </Text>
                    </View>

                    <View
                        style={{
                            flexDirection: 'row',
                            gap: 10,
                        }}
                    >
                        <Pressable
                            onPress={() => onTakeRest('short_rest')}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                paddingVertical: 13,
                                paddingHorizontal: 10,
                                borderRadius: 11,
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                backgroundColor:
                                    scheme === 'dark'
                                        ? 'rgba(214,173,96,0.10)'
                                        : 'rgba(139,100,44,0.07)',
                                borderWidth: 1,
                                borderColor: colors.border,
                            }}
                        >
                            <Text style={{ fontSize: 20 }}>☕</Text>

                            <Text
                                style={{
                                    color: colors.text,
                                    fontSize: 13,
                                    fontWeight: '700',
                                }}
                            >
                                Short Rest
                            </Text>

                            <Text
                                style={{
                                    color: colors.textSecondary,
                                    fontSize: 11,
                                }}
                            >
                                1 hour
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() =>
                                Alert.alert(
                                    'Take a Long Rest?',
                                    'This will restore your character according to the current rest rules. Your existing character log will also be cleared.',
                                    [
                                        {
                                            text: 'Cancel',
                                            style: 'cancel',
                                        },
                                        {
                                            text: 'Long Rest',
                                            onPress: () => {
                                                void onTakeRest('long_rest');
                                            },
                                        },
                                    ],
                                )
                            }
                            style={{
                                flex: 1,
                                minWidth: 0,
                                paddingVertical: 13,
                                paddingHorizontal: 10,
                                borderRadius: 11,
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                backgroundColor: colors.backgroundSelected,
                                borderWidth: 1,
                                borderColor: colors.accent,
                            }}
                        >
                            <Text style={{ fontSize: 20 }}>🌙</Text>

                            <Text
                                style={{
                                    color: colors.text,
                                    fontSize: 13,
                                    fontWeight: '700',
                                }}
                            >
                                Long Rest
                            </Text>

                            <Text
                                style={{
                                    color: colors.textSecondary,
                                    fontSize: 11,
                                }}
                            >
                                8 hours
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
            <Modal
                visible={traitModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setTraitModalVisible(false)}
            >
                <View
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 24,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                    }}
                >
                    <Pressable
                        onPress={() => setTraitModalVisible(false)}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                        }}
                    />

                    <View
                        style={{
                            width: '100%',
                            maxWidth: 420,
                            padding: 20,
                            gap: 16,
                            borderRadius: 16,
                            backgroundColor: colors.background,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <Text
                            style={{
                                color: colors.text,
                                fontSize: 18,
                                fontWeight: '800',
                            }}
                        >
                            Add Trait
                        </Text>

                        <TextInput
                            value={newTrait}
                            onChangeText={setNewTrait}
                            placeholder="Enter trait name"
                            placeholderTextColor={colors.textSecondary}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={() => {
                                const trait = newTrait.trim();

                                if (!trait) {
                                    Alert.alert(
                                        'Invalid Trait',
                                        'Trait name cannot be empty.',
                                    );
                                    return;
                                }

                                const duplicate = traits.some(
                                    item =>
                                        item.toLocaleLowerCase() ===
                                        trait.toLocaleLowerCase(),
                                );

                                if (duplicate) {
                                    Alert.alert(
                                        'Duplicate Trait',
                                        'This trait already exists.',
                                    );
                                    return;
                                }

                                onAddTrait(trait);
                                setTraitModalVisible(false);
                                setNewTrait('');
                            }}
                            style={{
                                padding: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 10,
                                backgroundColor: colors.backgroundElement,
                                color: colors.text,
                                fontSize: 14,
                            }}
                        />

                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'flex-end',
                                gap: 10,
                            }}
                        >
                            <Pressable
                                onPress={() => {
                                    setTraitModalVisible(false);
                                    setNewTrait('');
                                }}
                                style={{
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    borderRadius: 9,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                }}
                            >
                                <Text style={{ color: colors.text }}>
                                    Cancel
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() => {
                                    const trait = newTrait.trim();

                                    if (!trait) {
                                        Alert.alert(
                                            'Invalid Trait',
                                            'Trait name cannot be empty.',
                                        );
                                        return;
                                    }

                                    const duplicate = traits.some(
                                        item =>
                                            item.toLocaleLowerCase() ===
                                            trait.toLocaleLowerCase(),
                                    );

                                    if (duplicate) {
                                        Alert.alert(
                                            'Duplicate Trait',
                                            'This trait already exists.',
                                        );
                                        return;
                                    }

                                    onAddTrait(trait);
                                    setTraitModalVisible(false);
                                    setNewTrait('');
                                }}
                                style={{
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    borderRadius: 9,
                                    backgroundColor: colors.backgroundSelected,
                                }}
                            >
                                <Text
                                    style={{
                                        color: colors.text,
                                        fontWeight: '700',
                                    }}
                                >
                                    Add Trait
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </BlurView>
    );
}

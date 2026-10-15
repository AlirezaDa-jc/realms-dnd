import { Colors } from '@/constants/theme';
import type { Ability, Character } from '@/models/character';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    Text,
    useColorScheme,
    View,
} from 'react-native';

type SavingThrowsProps = {
    character: Character;
    onUpdate: (character: Character) => Promise<void>;
    onAddBonus?: (ability: Ability, category: 'saving_throw') => void;
};

const SAVING_THROWS: { name: string; ability: Ability }[] = [
    { name: 'Strength', ability: 'str' },
    { name: 'Dexterity', ability: 'dex' },
    { name: 'Constitution', ability: 'con' },
    { name: 'Intelligence', ability: 'int' },
    { name: 'Wisdom', ability: 'wis' },
    { name: 'Charisma', ability: 'cha' },
];

const PROFICIENCY_OPTIONS = [
    { value: 0, label: 'None' },
    { value: 1, label: 'Proficient' },
    { value: 2, label: 'Expertise' },
] as const;

export default function SavingThrows({
    character,
    onUpdate,
    onAddBonus,
}: SavingThrowsProps) {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedAbility, setSelectedAbility] =
        useState<Ability | null>(null);
    const [selectedProficiency, setSelectedProficiency] = useState(0);
    const [saving, setSaving] = useState(false);

    const styles = {
        title: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '700' as const,
        },
        text: {
            color: colors.text,
            fontSize: 14,
        },
        secondary: {
            color: colors.textSecondary,
            fontSize: 12,
        },
        button: {
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: colors.accent,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
        },
        buttonText: {
            color: isDark ? '#11100F' : '#FFFFFF',
            fontSize: 12,
            fontWeight: '600' as const,
        },
    };

    function openProficiencyModal(ability: Ability) {
        setSelectedAbility(ability);
        setSelectedProficiency(
            character.savingThrowProficiencies[ability] ?? 0,
        );
        setModalVisible(true);
    }

    function getProficiencyLabel(level: number): string {
        return (
            PROFICIENCY_OPTIONS.find((option) => option.value === level)
                ?.label ?? ''
        );
    }

    async function saveProficiency() {
        if (selectedAbility === null || saving) return;

        const updatedCharacter = Object.assign(
            Object.create(Object.getPrototypeOf(character)),
            character,
            {
                savingThrowProficiencies: {
                    ...character.savingThrowProficiencies,
                    [selectedAbility]: selectedProficiency,
                },
            },
        ) as Character;

        setSaving(true);

        try {
            await onUpdate(updatedCharacter);
            setModalVisible(false);
            setSelectedAbility(null);
        } catch (error) {
            Alert.alert(
                'Save failed',
                error instanceof Error
                    ? error.message
                    : 'Could not save saving throw proficiency.',
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <BlurView
            intensity={isDark ? 24 : 50}
            tint={isDark ? 'dark' : 'light'}
            style={{
                padding: 16,
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
                gap: 14,
                marginTop: 16,
            }}
        >
            <View style={{ gap: 12 }}>
                <Text style={styles.title}>SAVING THROWS</Text>

                {SAVING_THROWS.map(({ name, ability }) => {
                    const proficiency =
                        character.savingThrowProficiencies[ability] ?? 0;
                    const bonus = character.savingThrowBonus(ability);

                    return (
                        <View
                            key={ability}
                            style={{
                                paddingVertical: 8,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                                flexDirection: 'column',
                                gap: 16,
                            }}>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                            >
                                {/* Column 1: Name */}
                                <Text
                                    style={{
                                        ...styles.text,
                                        flex: 1,
                                    }}
                                >
                                    {name}
                                </Text>

                                {/* Column 2: Proficiency */}
                                <Text
                                    style={{
                                        ...styles.secondary,
                                        width: 100,
                                        textAlign: 'left',
                                    }}
                                >
                                    {getProficiencyLabel(proficiency)}
                                </Text>

                                {/* Column 3: Bonus */}
                                <Text
                                    style={{
                                        ...styles.text,
                                        width: 32,
                                        textAlign: 'right',
                                        fontVariant: ['tabular-nums'],
                                    }}
                                >
                                    {bonus >= 0 ? `+${bonus}` : bonus}
                                </Text>
                            </View>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 8,
                                }}
                            >

                                <Pressable
                                    onPress={() => openProficiencyModal(ability)}
                                    style={styles.button}
                                >
                                    <Text style={styles.buttonText}>Edit Proficiency</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() =>
                                        onAddBonus?.(ability, 'saving_throw')
                                    }
                                    style={[
                                        styles.button,
                                        !onAddBonus && { opacity: 0.5 },
                                    ]}
                                    disabled={!onAddBonus}
                                >
                                    <Text style={styles.buttonText}>Bonus</Text>
                                </Pressable>
                            </View>
                        </View>
                    );
                })}
            </View>

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!saving) {
                        setModalVisible(false);
                        setSelectedAbility(null);
                    }
                }}
            >
                <View
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        padding: 20,
                        backgroundColor: 'rgba(0,0,0,0.65)',
                    }}
                >
                    <View
                        style={{
                            padding: 20,
                            borderRadius: 16,
                            gap: 16,
                            backgroundColor: colors.background,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <Text style={styles.title}>
                            Proficiency —{' '}
                            {selectedAbility
                                ? SAVING_THROWS.find(
                                    (item) =>
                                        item.ability === selectedAbility,
                                )?.name
                                : ''}
                        </Text>

                        <Text style={styles.text}>Level</Text>

                        <View style={{ gap: 8 }}>
                            {PROFICIENCY_OPTIONS.map((option) => {
                                const selected =
                                    selectedProficiency === option.value;

                                return (
                                    <Pressable
                                        key={option.value}
                                        disabled={saving}
                                        onPress={() =>
                                            setSelectedProficiency(
                                                option.value,
                                            )
                                        }
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: 12,
                                            borderRadius: 8,
                                            borderWidth: 1,
                                            borderColor: selected
                                                ? colors.accent
                                                : colors.border,
                                            backgroundColor: selected
                                                ? colors.backgroundSelected
                                                : colors.backgroundElement,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 18,
                                                height: 18,
                                                borderRadius: 9,
                                                borderWidth: 1,
                                                borderColor: selected
                                                    ? colors.accent
                                                    : colors.textSecondary,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            {selected && (
                                                <View
                                                    style={{
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: 5,
                                                        backgroundColor:
                                                            colors.accent,
                                                    }}
                                                />
                                            )}
                                        </View>

                                        <Text style={styles.text}>
                                            {option.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'flex-end',
                                gap: 8,
                                marginTop: 4,
                            }}
                        >
                            <Pressable
                                onPress={() => {
                                    setModalVisible(false);
                                    setSelectedAbility(null);
                                }}
                                disabled={saving}
                                style={[
                                    styles.button,
                                    {
                                        backgroundColor:
                                            colors.backgroundElement,
                                    },
                                ]}
                            >
                                <Text
                                    style={{
                                        ...styles.buttonText,
                                        color: colors.text,
                                    }}
                                >
                                    Cancel
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={saveProficiency}
                                disabled={saving}
                                style={[
                                    styles.button,
                                    saving && { opacity: 0.5 },
                                ]}
                            >
                                <Text style={styles.buttonText}>
                                    {saving ? 'Saving...' : 'Save'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </BlurView >
    );
}

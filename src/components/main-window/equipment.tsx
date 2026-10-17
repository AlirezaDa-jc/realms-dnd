import { useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    Text,
    TextInput,
    View,
    useColorScheme,
} from 'react-native';
import { BlurView } from 'expo-blur';

import { Colors } from '@/constants/theme';
import { EquipmentItem } from '@/models/equipment';
import type { Character } from '@/models/character';

type EquipmentProps = {
    character: Character;
    onUpdate: (character: Character) => Promise<void>;
};

type EquipmentForm = {
    name: string;
    quantity: string;
    weight: string;
    value: string;
};

const EMPTY_FORM: EquipmentForm = {
    name: '',
    quantity: '1',
    weight: '0',
    value: '0',
};

export default function Equipment({
    character,
    onUpdate,
}: EquipmentProps) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [modalVisible, setModalVisible] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [form, setForm] = useState<EquipmentForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const totalWeight = character.equipment.reduce(
        (total, item) => total + item.quantity * item.weight,
        0,
    );

    const openAddModal = () => {
        setEditingIndex(null);
        setForm(EMPTY_FORM);
        setModalVisible(true);
    };

    const openEditModal = (index: number) => {
        const item = character.equipment[index];
        if (!item) return;

        setEditingIndex(index);
        setForm({
            name: item.name,
            quantity: String(item.quantity),
            weight: String(item.weight),
            value: item.value,
        });
        setModalVisible(true);
    };

    const saveEquipment = async () => {
        const name = form.name.trim();
        const quantity = Number(form.quantity);
        const weight = Number(form.weight);
        const value = form.value.trim();

        if (!name) {
            Alert.alert('Invalid equipment', 'Enter an equipment name.');
            return;
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            Alert.alert(
                'Invalid quantity',
                'Quantity must be an integer more than 1.',
            );
            return;
        }

        if (!Number.isFinite(weight) || weight < 0 || weight > 999999) {
            Alert.alert(
                'Invalid weight',
                'Weight must be a number between 0 and 999999 lb.',
            );
            return;
        }

        const updatedCharacter = Object.assign(
            Object.create(Object.getPrototypeOf(character)),
            character,
            { equipment: [...character.equipment] },
        ) as Character;

        try {
            setSaving(true);

            if (editingIndex === null) {
                updatedCharacter.equipment.push(
                    new EquipmentItem(name, quantity, weight, value),
                );
            } else {
                updatedCharacter.equipment[editingIndex] =
                    new EquipmentItem(name, quantity, weight, value);
            }

            await onUpdate(updatedCharacter);
            setModalVisible(false);
        } catch (error) {
            Alert.alert(
                'Could not save equipment',
                error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred.',
            );
        } finally {
            setSaving(false);
        }
    };

    const removeEquipment = (index: number) => {
        const item = character.equipment[index];
        if (!item) return;

        Alert.alert(
            'Remove equipment',
            `Remove "${item.name}" from this character?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        const updatedCharacter = Object.assign(
                            Object.create(Object.getPrototypeOf(character)),
                            character,
                            {
                                equipment: character.equipment.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                ),
                            },
                        ) as Character;

                        try {
                            await onUpdate(updatedCharacter);
                        } catch (error) {
                            Alert.alert(
                                'Could not remove equipment',
                                error instanceof Error
                                    ? error.message
                                    : 'An unexpected error occurred.',
                            );
                        }
                    },
                },
            ],
        );
    };

    const updateForm = (field: keyof EquipmentForm, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const cardBackground = colors.backgroundElement;

    return (
        <BlurView
            intensity={scheme === 'dark' ? 24 : 50}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={{
                padding: 16,
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
                gap: 14,
                marginTop: 16
            }}
        >
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                }}
            >
                <Text
                    style={{
                        color: colors.text,
                        fontSize: 16,
                        fontWeight: '700',
                    }}
                >
                    EQUIPMENT
                </Text>

                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    ({totalWeight.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                    })} lb)
                </Text>

                <View style={{ flex: 1 }} />

                <Pressable
                    onPress={openAddModal}
                    style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: colors.accent,
                    }}
                >
                    <Text
                        style={{
                            color: scheme === 'dark' ? '#11100F' : '#FFFFFF',
                            fontWeight: '600',
                            fontSize: 12,
                        }}
                    >
                        + Add Equipment
                    </Text>
                </Pressable>
            </View>

            {character.equipment.length === 0 ? (
                <Text
                    style={{
                        color: colors.textSecondary,
                        fontSize: 13,
                    }}
                >
                    No equipment yet. Add an item to get started.
                </Text>
            ) : (
                character.equipment.map((item, index) => (
                    <View
                        key={`${item.name}-${index}`}
                        style={{
                            backgroundColor: cardBackground,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            padding: 14,
                            gap: 8,
                        }}
                    >
                        <Text
                            style={{
                                color: colors.accent,
                                fontSize: 15,
                                fontWeight: '700',
                            }}
                        >
                            {item.name}
                        </Text>

                        <Text
                            style={{
                                color: colors.textSecondary,
                                fontSize: 12,
                                lineHeight: 18,
                            }}
                        >
                            Quantity: {item.quantity}
                            {'  ·  '}
                            Unit Weight: {item.weight} lb
                            {'  ·  '}
                            Total: {item.quantity * item.weight} lb
                        </Text>

                        <Text
                            style={{
                                color: colors.textSecondary,
                                fontSize: 12,
                                lineHeight: 18,
                            }}
                        >
                            Value: {item.value}
                        </Text>

                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 10,
                                marginTop: 4,
                            }}
                        >
                            <Pressable
                                onPress={() => openEditModal(index)}
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    padding: 9,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                }}
                            >
                                <Text style={{ color: colors.text }}>Edit</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => removeEquipment(index)}
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    padding: 9,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: '#A94B45',
                                }}
                            >
                                <Text style={{ color: '#C85D55' }}>Remove</Text>
                            </Pressable>
                        </View>
                    </View>
                ))
            )}

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
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
                        <Text
                            style={{
                                color: colors.text,
                                fontSize: 18,
                                fontWeight: '700',
                            }}
                        >
                            {editingIndex === null
                                ? 'Add Equipment'
                                : 'Edit Equipment'}
                        </Text>

                        <View style={{ gap: 6 }}>
                            <Text style={{ color: colors.textSecondary }}>
                                Name
                            </Text>
                            <TextInput
                                value={form.name}
                                onChangeText={(value) => updateForm('name', value)}
                                placeholder="e.g. Rope, Longsword"
                                placeholderTextColor={colors.textSecondary}
                                autoCapitalize="sentences"
                                style={{
                                    color: colors.text,
                                    backgroundColor: cardBackground,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 8,
                                    padding: 12,
                                }}
                            />
                        </View>

                        <View style={{ gap: 6 }}>
                            <Text style={{ color: colors.textSecondary }}>
                                Quantity
                            </Text>
                            <TextInput
                                value={form.quantity}
                                onChangeText={(value) =>
                                    updateForm('quantity', value)
                                }
                                keyboardType="number-pad"
                                style={{
                                    color: colors.text,
                                    backgroundColor: cardBackground,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 8,
                                    padding: 12,
                                }}
                            />
                        </View>

                        <View style={{ gap: 6 }}>
                            <Text style={{ color: colors.textSecondary }}>
                                Unit weight (lb)
                            </Text>
                            <TextInput
                                value={form.weight}
                                onChangeText={(value) =>
                                    updateForm('weight', value)
                                }
                                keyboardType="decimal-pad"
                                style={{
                                    color: colors.text,
                                    backgroundColor: cardBackground,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 8,
                                    padding: 12,
                                }}
                            />
                        </View>

                        <View style={{ gap: 6 }}>
                            <Text style={{ color: colors.textSecondary }}>
                                Value
                            </Text>
                            <TextInput
                                value={form.value}
                                onChangeText={(value) => updateForm('value', value)}
                                placeholder="e.g. 1 GP"
                                placeholderTextColor={colors.textSecondary}
                                autoCapitalize="sentences"
                                style={{
                                    color: colors.text,
                                    backgroundColor: cardBackground,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 8,
                                    padding: 12,
                                }}
                            />
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Pressable
                                disabled={saving}
                                onPress={() => setModalVisible(false)}
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    padding: 12,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                }}
                            >
                                <Text style={{ color: colors.text }}>Cancel</Text>
                            </Pressable>

                            <Pressable
                                disabled={saving}
                                onPress={() => void saveEquipment()}
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    padding: 12,
                                    borderRadius: 8,
                                    backgroundColor: colors.accent,
                                    opacity: saving ? 0.6 : 1,
                                }}
                            >
                                <Text
                                    style={{
                                        color: scheme === 'dark'
                                            ? '#11100F'
                                            : '#FFFFFF',
                                        fontWeight: '700',
                                    }}
                                >
                                    {saving ? 'Saving...' : 'Save'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </BlurView>
    );
}

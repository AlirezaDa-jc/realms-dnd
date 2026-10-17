import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    useColorScheme,
    View,
} from 'react-native';

import { useDialog } from '@/components/dialog/realms-dialog';
import { Colors } from '@/constants/theme';
import type { Character } from '@/models/character';
import { StatBonus } from '@/models/stat-bonus';
import type { BonusCategory } from '@/rules/dnd5e-2024';

export type BonusOption = {
    label: string;
    category: BonusCategory | null;
};

type BonusManagerProps = {
    visible: boolean;
    character: Character;
    stat: string;
    title: string;
    categories: BonusOption[];
    initialCategory: BonusCategory | null;
    onUpdate: (character: Character) => Promise<void>;
    onClose: () => void;
};

export default function BonusManager({
    visible,
    character,
    stat,
    title,
    categories,
    initialCategory,
    onUpdate,
    onClose,
}: BonusManagerProps) {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];
    const { showInfo, showConfirm } = useDialog();

    const [adding, setAdding] = useState(false);
    const [category, setCategory] = useState<BonusCategory | null>(
        initialCategory,
    );
    const [amount, setAmount] = useState('1');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setAdding(false);
            setCategory(initialCategory);
            setAmount('1');
            setReason('');
        }
    }, [visible, stat, initialCategory]);

    const matchingBonuses = character.statBonuses
        .map((bonus, index) => ({ bonus, index }))
        .filter(
            ({ bonus }) =>
                bonus.stat === stat &&
                categories.some(
                    (option) => option.category === bonus.category,
                ),
        );

    const textStyle = {
        color: colors.text,
        fontSize: 14,
    } as const;

    const buttonStyle = {
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    };

    function categoryLabel(value: BonusCategory | null) {
        return (
            categories.find((option) => option.category === value)?.label ??
            'Bonus'
        );
    }

    async function saveBonus() {
        if (saving) return;

        const numericAmount = Number(amount);
        const trimmedReason = reason.trim();

        if (
            amount.trim() === '' ||
            !Number.isInteger(numericAmount) ||
            numericAmount < -99 ||
            numericAmount > 99
        ) {
            showInfo(
                'Invalid amount',
                'Enter a whole number between -99 and 99.',
            );
            return;
        }

        if (!trimmedReason) {
            showInfo(
                'Missing reason',
                'Please enter a reason for this bonus.',
            );
            return;
        }

        if (!categories.some((option) => option.category === category)) {
            showInfo('Invalid category', 'Select a bonus type.');
            return;
        }

        const updatedCharacter = Object.assign(
            Object.create(Object.getPrototypeOf(character)),
            character,
            {
                statBonuses: [
                    ...character.statBonuses,
                    new StatBonus(
                        stat,
                        numericAmount,
                        trimmedReason,
                        category,
                    ),
                ],
            },
        ) as Character;

        setSaving(true);

        try {
            await onUpdate(updatedCharacter);
            setAdding(false);
            setAmount('1');
            setReason('');
        } catch (error) {
            showInfo(
                'Save failed',
                error instanceof Error
                    ? error.message
                    : 'Could not save the bonus.',
            );
        } finally {
            setSaving(false);
        }
    }

    function deleteBonus(index: number) {
        if (saving) return;

        showConfirm({
            title: 'Delete bonus',
            message: 'Are you sure you want to delete this bonus?',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            destructive: true,
            onConfirm: async () => {
                await performDelete(index);
            },
        });
    }

    async function performDelete(index: number) {
        if (saving) return;

        const updatedCharacter = Object.assign(
            Object.create(Object.getPrototypeOf(character)),
            character,
            {
                statBonuses: character.statBonuses.filter(
                    (_, bonusIndex) => bonusIndex !== index,
                ),
            },
        ) as Character;

        setSaving(true);

        try {
            await onUpdate(updatedCharacter);
        } catch (error) {
            showInfo(
                'Delete failed',
                error instanceof Error
                    ? error.message
                    : 'Could not delete the bonus.',
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => {
                if (!saving) {
                    onClose();
                }
            }}
        >
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    padding: 20,
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    alignItems: 'center',
                }}
            >
                <BlurView
                    intensity={isDark ? 35 : 55}
                    tint={isDark ? 'dark' : 'light'}
                    style={{
                        maxHeight: '85%',
                        borderRadius: 18,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: colors.border,
                        maxWidth: 600,
                        minWidth: 300,
                    }}
                >
                    <View
                        style={{
                            padding: 18,
                            gap: 14,
                            backgroundColor: colors.background,
                        }}
                    >
                        <Text
                            style={{
                                color: colors.text,
                                fontSize: 18,
                                fontWeight: '800',
                            }}
                        >
                            {adding
                                ? `Add Bonus — ${title}`
                                : `Bonuses — ${title}`}
                        </Text>

                        {adding ? (
                            <ScrollView
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={{ gap: 14 }}
                            >
                                <Text style={textStyle}>Bonus Type</Text>

                                <View
                                    style={{
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        gap: 8,
                                    }}
                                >
                                    {categories.map((option) => {
                                        const selected =
                                            category === option.category;

                                        return (
                                            <Pressable
                                                key={option.label}
                                                disabled={saving}
                                                onPress={() =>
                                                    setCategory(option.category)
                                                }
                                                style={[
                                                    buttonStyle,
                                                    {
                                                        backgroundColor: selected
                                                            ? colors.backgroundSelected
                                                            : colors.backgroundElement,
                                                        borderColor: selected
                                                            ? colors.accent
                                                            : colors.border,
                                                    },
                                                ]}
                                            >
                                                <Text style={textStyle}>
                                                    {option.label}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                <Text style={textStyle}>Amount</Text>

                                <TextInput
                                    value={amount}
                                    onChangeText={(value) =>
                                        setAmount(
                                            value.replace(/[^0-9-]/g, ''),
                                        )
                                    }
                                    keyboardType="numbers-and-punctuation"
                                    placeholder="-99 to 99"
                                    placeholderTextColor={colors.textSecondary}
                                    editable={!saving}
                                    style={{
                                        color: colors.text,
                                        backgroundColor:
                                            colors.backgroundElement,
                                        borderColor: colors.border,
                                        borderWidth: 1,
                                        borderRadius: 10,
                                        padding: 12,
                                    }}
                                />

                                <Text style={textStyle}>Reason</Text>

                                <TextInput
                                    value={reason}
                                    onChangeText={setReason}
                                    placeholder="e.g. Magic item, class feature, blessing"
                                    placeholderTextColor={colors.textSecondary}
                                    editable={!saving}
                                    style={{
                                        color: colors.text,
                                        backgroundColor:
                                            colors.backgroundElement,
                                        borderColor: colors.border,
                                        borderWidth: 1,
                                        borderRadius: 10,
                                        padding: 12,
                                    }}
                                />
                            </ScrollView>
                        ) : (
                            <ScrollView
                                style={{ maxHeight: 340 }}
                                contentContainerStyle={{ gap: 10 }}
                            >
                                {matchingBonuses.length === 0 ? (
                                    <Text
                                        style={{
                                            ...textStyle,
                                            color: colors.textSecondary,
                                            paddingVertical: 12,
                                        }}
                                    >
                                        No bonuses
                                    </Text>
                                ) : (
                                    matchingBonuses.map(({ bonus, index }) => (
                                        <View
                                            key={`${bonus.stat}-${bonus.category}-${index}`}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: 12,
                                                borderRadius: 10,
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                backgroundColor:
                                                    colors.backgroundElement,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    flex: 1,
                                                    gap: 4,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        ...textStyle,
                                                        fontWeight: '700',
                                                    }}
                                                >
                                                    {bonus.amount >= 0
                                                        ? `+${bonus.amount}`
                                                        : bonus.amount}{' '}
                                                    |{' '}
                                                    {categoryLabel(
                                                        bonus.category,
                                                    )}
                                                </Text>

                                                <Text
                                                    style={{
                                                        color: colors.textSecondary,
                                                        fontSize: 12,
                                                    }}
                                                >
                                                    {bonus.reason}
                                                </Text>
                                            </View>

                                            <Pressable
                                                disabled={saving}
                                                onPress={() =>
                                                    deleteBonus(index)
                                                }
                                                style={[
                                                    buttonStyle,
                                                    {
                                                        backgroundColor:
                                                            colors.background,
                                                        opacity: saving ? 0.5 : 1,
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={{
                                                        ...textStyle,
                                                        fontSize: 12,
                                                    }}
                                                >
                                                    Delete
                                                </Text>
                                            </Pressable>
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                        )}

                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 8,
                                justifyContent: 'flex-end',
                            }}
                        >
                            <Pressable
                                disabled={saving}
                                onPress={() => {
                                    if (adding) {
                                        setAdding(false);
                                    } else {
                                        onClose();
                                    }
                                }}
                                style={[
                                    buttonStyle,
                                    {
                                        backgroundColor:
                                            colors.backgroundElement,
                                        opacity: saving ? 0.5 : 1,
                                    },
                                ]}
                            >
                                <Text style={textStyle}>
                                    {adding ? 'Back' : 'Close'}
                                </Text>
                            </Pressable>

                            {adding ? (
                                <Pressable
                                    disabled={saving}
                                    onPress={() => void saveBonus()}
                                    style={[
                                        buttonStyle,
                                        {
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            backgroundColor: colors.accent,
                                            opacity: saving ? 0.5 : 1,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={{
                                            ...textStyle,
                                            fontWeight: '800',
                                            color: isDark ? '#11100F' : '#FFFFFF',
                                        }}
                                    >
                                        {saving ? 'Saving…' : 'Save'}
                                    </Text>
                                </Pressable>
                            ) : (
                                <Pressable
                                    disabled={saving}
                                    onPress={() => {
                                        setCategory(initialCategory);
                                        setAmount('1');
                                        setReason('');
                                        setAdding(true);
                                    }}
                                    style={[
                                        buttonStyle,
                                        {
                                            opacity: saving ? 0.5 : 1,
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            backgroundColor: colors.accent,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={{
                                            ...textStyle,
                                            fontWeight: '800',
                                            color: isDark ? '#11100F' : '#FFFFFF',
                                        }}
                                    >
                                        Bonus
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
}

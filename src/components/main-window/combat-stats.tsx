import { BlurView } from 'expo-blur';
import { useState } from 'react';
import {
    Modal,
    Pressable,
    Text,
    TextInput,
    useColorScheme,
    View,
} from 'react-native';

import { useDialog } from '@/components/dialog/realms-dialog';
import { Colors } from '@/constants/theme';
import type { Character } from '@/models/character';
import type { CombatStat } from '@/rules/dnd5e-2024';

type CombatStatsProps = {
    character: Character;
    onUpdate: (character: Character) => Promise<void>;
    onAddBonus?: (stat: CombatStat, title: string) => void;
};

type HpAction = 'damage' | 'heal' | 'temporary';

export default function CombatStats({
    character,
    onUpdate,
    onAddBonus,
}: CombatStatsProps) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const { showInfo } = useDialog();

    const [action, setAction] = useState<HpAction | null>(null);
    const [amount, setAmount] = useState('');
    const [saving, setSaving] = useState(false);

    function openAction(nextAction: HpAction) {
        setAmount('');
        setAction(nextAction);
    }

    async function applyAction() {
        const value = Number(amount);

        if (
            amount.trim() === '' ||
            !Number.isInteger(value) ||
            value < 0
        ) {
            showInfo(
                'Invalid value',
                'Enter a non-negative whole number.',
            );
            return;
        }

        const updatedCharacter = Object.assign(
            Object.create(Object.getPrototypeOf(character)),
            character,
        ) as Character;

        try {
            if (action === 'damage') {
                updatedCharacter.takeDamage(value);
            } else if (action === 'heal') {
                updatedCharacter.heal(value);
            } else if (action === 'temporary') {
                updatedCharacter.setTemporaryHp(value);
            } else {
                return;
            }

            setSaving(true);
            await onUpdate(updatedCharacter);
            setAction(null);
        } catch (error) {
            showInfo(
                'Update failed',
                error instanceof Error
                    ? error.message
                    : 'Could not update character.',
            );
        } finally {
            setSaving(false);
        }
    }

    const cardStyle = {
        flex: 1,
        minWidth: 145,
        padding: 16,
        gap: 12,
        borderRadius: 14,
        backgroundColor: colors.backgroundElement,
        borderWidth: 1,
        borderColor: colors.border,
    } as const;

    const labelStyle = {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '800' as const,
        letterSpacing: 1,
    };

    const valueStyle = {
        color: colors.text,
        fontSize: 25,
        fontWeight: '800' as const,
    };

    const getBonusSummary = (stat: string): string => {
        const bonuses = character.getStatBonuses(stat);

        if (bonuses.length === 0) {
            return 'No bonuses';
        }

        return bonuses
            .map(
                (bonus) =>
                    `${bonus.amount >= 0 ? '+' : ''}${bonus.amount} (${bonus.reason})`,
            )
            .join(' · ');
    };

    function buttonStyle(primary = false) {
        return {
            flex: 1,
            minHeight: 38,
            paddingHorizontal: 10,
            paddingVertical: 8,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            borderRadius: 9,
            backgroundColor: primary
                ? colors.backgroundSelected
                : colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            minWidth: 60,
        };
    }

    function renderButton(
        label: string,
        onPress: () => void,
        primary = false,
    ) {
        return (
            <Pressable
                key={label}
                onPress={onPress}
                style={buttonStyle(primary)}
            >
                <Text
                    style={{
                        color: colors.text,
                        fontSize: 14,
                        fontWeight: '700',
                    }}
                    numberOfLines={1}
                >
                    {label}
                </Text>
            </Pressable>
        );
    }

    function renderStat(
        label: string,
        value: string,
        category: CombatStat,
    ) {
        return (
            <View key={label} style={cardStyle}>
                <Text style={labelStyle}>{label}</Text>

                <Text style={valueStyle}>{value}</Text>

                <Text
                    style={{
                        color: colors.textSecondary,
                        fontSize: 12,
                        marginTop: 4,
                    }}
                >
                    {getBonusSummary(category)}
                </Text>

                <Pressable
                    onPress={() => onAddBonus?.(category, label)}
                    disabled={!onAddBonus}
                    style={{
                        backgroundColor: colors.backgroundSelected,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: onAddBonus ? 1 : 0.5,
                    }}
                >
                    <Text
                        style={{
                            color: colors.text,
                            fontSize: 12,
                            fontWeight: '600',
                        }}
                    >
                        Bonus
                    </Text>
                </Pressable>
            </View>
        );
    }

    const actionTitle =
        action === 'damage'
            ? 'Take Damage'
            : action === 'heal'
                ? 'Heal Character'
                : 'Set Temporary HP';

    return (
        <BlurView
            intensity={scheme === 'dark' ? 35 : 55}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={{
                borderRadius: 18,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
                marginTop: 16,
            }}
        >
            <View style={{ padding: 18, gap: 16 }}>
                <Text
                    style={{
                        color: colors.accent,
                        fontSize: 12,
                        fontWeight: '800',
                        letterSpacing: 2,
                    }}
                >
                    COMBAT STATISTICS
                </Text>

                <View
                    style={{
                        flexDirection: 'column',
                        gap: 16,
                    }}
                >
                    <View style={cardStyle}>
                        <Text style={labelStyle}>HIT POINTS</Text>

                        <Text style={valueStyle}>
                            {character.currentHp} / {character.maxHp}
                        </Text>

                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 4,
                            }}
                        >
                            {renderButton(
                                '− Damage',
                                () => openAction('damage'),
                            )}

                            {renderButton(
                                '+ Heal',
                                () => openAction('heal'),
                                true,
                            )}
                        </View>
                    </View>

                    <View style={cardStyle}>
                        <Text style={labelStyle}>TEMPORARY HP</Text>

                        <Text style={valueStyle}>
                            {character.temporaryHp}
                        </Text>

                        <View style={{
                            marginTop: 'auto'
                        }}>
                            {renderButton(
                                'Set Temp HP',
                                () => openAction('temporary'),
                                true,
                            )}
                        </View>
                    </View>
                </View>

                <View
                    style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 12,
                    }}
                >
                    {renderStat(
                        'ARMOR CLASS',
                        String(character.armorClass),
                        'armor_class',
                    )}

                    {renderStat(
                        'INITIATIVE',
                        `${character.initiative >= 0 ? '+' : ''}${character.initiative}`,
                        'initiative',
                    )}

                    {renderStat(
                        'SPEED',
                        `${character.totalSpeed} ft`,
                        'speed',
                    )}
                </View>

                <Modal
                    visible={action !== null}
                    transparent
                    animationType="fade"
                    onRequestClose={() => {
                        if (!saving) {
                            setAction(null);
                        }
                    }}
                >
                    <View
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            padding: 24,
                            backgroundColor: 'rgba(0,0,0,0.55)',
                            alignItems: 'center',
                        }}
                    >
                        <View
                            style={{
                                padding: 20,
                                gap: 16,
                                borderRadius: 16,
                                backgroundColor: colors.background,
                                borderWidth: 1,
                                borderColor: colors.border,
                                maxWidth: 600,
                                minWidth: 300,
                            }}
                        >
                            <Text
                                style={{
                                    color: colors.text,
                                    fontSize: 19,
                                    fontWeight: '800',
                                }}
                            >
                                {actionTitle}
                            </Text>

                            <TextInput
                                value={amount}
                                onChangeText={(text) =>
                                    setAmount(text.replace(/[^0-9]/g, ''))
                                }
                                keyboardType="number-pad"
                                placeholder="Amount"
                                placeholderTextColor={colors.textSecondary}
                                editable={!saving}
                                autoFocus
                                style={{
                                    padding: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 10,
                                    color: colors.text,
                                    backgroundColor: colors.backgroundElement,
                                }}
                            />

                            <View
                                style={{
                                    flexDirection: 'row',
                                    gap: 10,
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Pressable
                                        disabled={saving}
                                        onPress={() => setAction(null)}
                                        style={[
                                            buttonStyle(),
                                            {
                                                opacity: saving ? 0.5 : 1,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                color: colors.text,
                                                fontSize: 14,
                                                fontWeight: '700',
                                            }}
                                        >
                                            Cancel
                                        </Text>
                                    </Pressable>
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Pressable
                                        disabled={saving}
                                        onPress={() => void applyAction()}
                                        style={[
                                            buttonStyle(true),
                                            {
                                                opacity: saving ? 0.6 : 1,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                color:
                                                    scheme === 'dark'
                                                        ? '#11100F'
                                                        : '#FFFFFF',
                                                fontWeight: '800',
                                            }}
                                        >
                                            {saving ? 'Saving…' : 'Apply'}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </BlurView>
    );
}

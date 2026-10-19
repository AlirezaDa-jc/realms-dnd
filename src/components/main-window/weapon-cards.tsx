import { BlurView } from 'expo-blur';
import { useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    useColorScheme,
    View
} from 'react-native';

import { useDialog } from '@/components/dialog/realms-dialog';
import { Colors } from '@/constants/theme';
import { Character } from '@/models/character';
import { StatBonus } from '@/models/stat-bonus';
import { Weapon } from '@/models/weapon';
import type { Ability } from '@/rules/dnd5e-2024';

type WeaponCardsProps = {
    character: Character;
    onUpdate: (character: Character) => Promise<void>;
};

type WeaponForm = {
    name: string;
    attackAbility: Ability;
    damageAbility: Ability;
    attackBonus: string;
    damageBonus: string;
    damageDice: string;
    damageType: string;
    isProficient: boolean;
    isFinesse: boolean;
    isThrown: boolean;
    isBound: boolean;
};

const ABILITIES: { value: Ability; label: string }[] = [
    { value: 'str', label: 'STR' },
    { value: 'dex', label: 'DEX' },
    { value: 'con', label: 'CON' },
    { value: 'int', label: 'INT' },
    { value: 'wis', label: 'WIS' },
    { value: 'cha', label: 'CHA' },
];

const DEFAULT_FORM: WeaponForm = {
    name: '',
    attackAbility: 'str',
    damageAbility: 'str',
    attackBonus: '',
    damageBonus: '',
    damageDice: '1d8',
    damageType: 'slashing',
    isProficient: true,
    isFinesse: false,
    isThrown: false,
    isBound: false,
};

export default function WeaponCards({
    character,
    onUpdate,
}: WeaponCardsProps) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const { showInfo, showConfirm } = useDialog();
    const [modalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<WeaponForm>(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);

    const weapons = character.weapons ?? [];

    const cardStyle = {
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

    function updateForm<K extends keyof WeaponForm>(
        key: K,
        value: WeaponForm[K],
    ) {
        setForm((previous) => ({ ...previous, [key]: value }));
    }

    function getWeaponBonus(weapon: Weapon, category: string): number {
        return weapon.statBonuses
            .filter((bonus) => bonus.category === category)
            .reduce((total, bonus) => total + bonus.amount, 0);
    }

    function openAdd() {
        setEditingId(null);
        setForm(DEFAULT_FORM);
        setModalVisible(true);
    }

    function openEdit(weapon: Weapon) {
        setEditingId(weapon.id);

        setForm({
            name: weapon.name,
            attackAbility: weapon.attackAbility,
            damageAbility: weapon.damageAbility,
            attackBonus: String(
                getWeaponBonus(weapon, 'weapon_attack') || '',
            ),
            damageBonus: String(
                getWeaponBonus(weapon, 'weapon_damage') || '',
            ),
            damageDice: weapon.damageDice,
            damageType: weapon.damageType,
            isProficient: weapon.isProficient,
            isFinesse: weapon.isFinesse,
            isThrown: weapon.isThrown,
            isBound: weapon.isBound,
        });

        setModalVisible(true);
    }

    function parseBonus(value: string): number | null {
        if (!value.trim()) return null;

        const parsed = Number(value);

        if (!Number.isInteger(parsed) || !Number.isFinite(parsed)) {
            throw new Error('Weapon bonuses must be whole numbers.');
        }

        return parsed;
    }

    async function saveWeapon() {
        if (saving) return;

        try {
            if (!form.name.trim()) {
                throw new Error('Enter a weapon name.');
            }

            if (!form.damageDice.trim() || !form.damageType.trim()) {
                throw new Error('Enter the damage dice and damage type.');
            }

            const attackBonus = parseBonus(form.attackBonus);
            const damageBonus = parseBonus(form.damageBonus);

            const existing = weapons.find(
                (weapon) => weapon.id === editingId,
            );

            // Preserve any other bonus categories on the weapon.
            const statBonuses = (existing?.statBonuses ?? []).filter(
                (bonus) =>
                    bonus.category !== 'weapon_attack' &&
                    bonus.category !== 'weapon_damage',
            );

            if (attackBonus !== null) {
                statBonuses.push(
                    new StatBonus(
                        'attack',
                        attackBonus,
                        'Weapon attack bonus',
                        'weapon_attack',
                    ),
                );
            }

            if (damageBonus !== null) {
                statBonuses.push(
                    new StatBonus(
                        'damage',
                        damageBonus,
                        'Weapon damage bonus',
                        'weapon_damage',
                    ),
                );
            }

            const updatedWeapon = new Weapon({
                id: editingId ?? undefined,
                name: form.name,
                attackAbility: form.attackAbility,
                damageAbility: form.damageAbility,
                damageDice: form.damageDice,
                damageType: form.damageType,
                isProficient: form.isProficient,
                isFinesse: form.isFinesse,
                isThrown: form.isThrown,
                isBound: form.isBound,
                isUnarmed: existing?.isUnarmed ?? false,
                statBonuses,
            });

            const updatedCharacter = Object.assign(
                Object.create(Object.getPrototypeOf(character)),
                character,
            ) as Character;

            updatedCharacter.weapons = editingId
                ? weapons.map((weapon) =>
                    weapon.id === editingId ? updatedWeapon : weapon,
                )
                : [...weapons, updatedWeapon];

            setSaving(true);
            await onUpdate(updatedCharacter);
            setModalVisible(false);
        } catch (error) {
            showInfo(
                'Could not save weapon',
                error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function deleteWeapon(weapon: Weapon) {

        if (!weapon || weapon.isUnarmed) {
            return;
        }

        showConfirm({
            title: 'Delete weapon',
            message: `Delete ${weapon.name}? This cannot be undone.`,
            cancelLabel: 'Cancel',
            confirmLabel: 'Delete',
            destructive: true,
            onConfirm: async () => {
                setSaving(true);

                try {
                    const updatedCharacter = Object.assign(
                        Object.create(Object.getPrototypeOf(character)),
                        character,
                    ) as Character;

                    updatedCharacter.weapons =
                        updatedCharacter.weapons.filter(
                            (item) => item !== weapon,
                        );

                    await onUpdate(updatedCharacter);
                } catch (error) {
                    showInfo(
                        'Delete failed',
                        error instanceof Error
                            ? error.message
                            : 'Could not delete this weapon.',
                    );
                } finally {
                    setSaving(false);
                }
            },
        });
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
                style={{
                    flex: 1,
                    minHeight: 38,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 9,
                    backgroundColor: primary
                        ? colors.backgroundSelected
                        : colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                }}
            >
                <Text
                    style={{
                        color: colors.text,
                        fontSize: 13,
                        fontWeight: '700',
                    }}
                >
                    {label}
                </Text>
            </Pressable>
        );
    }

    function renderField(
        label: string,
        value: string,
        onChangeText: (value: string) => void,
        placeholder: string,
        keyboardType: 'default' | 'numeric' = 'default',
    ) {
        return (
            <View style={{ gap: 6 }}>
                <Text style={labelStyle}>{label}</Text>
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType={keyboardType}
                    editable={!saving}
                    style={{
                        padding: 11,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 9,
                        color: colors.text,
                        backgroundColor: colors.background,
                    }}
                />
            </View>
        );
    }

    function renderAbilityPicker(
        label: string,
        value: Ability,
        onChange: (ability: Ability) => void,
    ) {
        return (
            <View style={{ gap: 8 }}>
                <Text style={labelStyle}>{label}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {ABILITIES.map((ability) => {
                        const selected = ability.value === value;

                        return (
                            <Pressable
                                key={ability.value}
                                onPress={() => onChange(ability.value)}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 9,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: selected
                                        ? colors.backgroundSelected
                                        : colors.background,
                                }}
                            >
                                <Text
                                    style={{
                                        color: colors.text,
                                        fontSize: 12,
                                        fontWeight: selected ? '800' : '600',
                                    }}
                                >
                                    {ability.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        );
    }

    function renderToggle(
        label: string,
        value: boolean,
        onPress: () => void,
    ) {
        return (
            <Pressable
                key={label}
                onPress={onPress}
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 11,
                    borderRadius: 9,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: value
                        ? colors.backgroundSelected
                        : colors.background,
                }}
            >
                <Text
                    style={{
                        color: colors.text,
                        fontSize: 13,
                        fontWeight: '600',
                    }}
                >
                    {label}
                </Text>
                <Text
                    style={{
                        color: value ? colors.accent : colors.textSecondary,
                        fontWeight: '800',
                    }}
                >
                    {value ? 'ON' : 'OFF'}
                </Text>
            </Pressable>
        );
    }

    function renderWeapon(weapon: Weapon) {
        const attackBonus = weapon.getAttackBonus(character);
        const damageBonus = weapon.getDamageBonus(character);
        const damageSign = damageBonus >= 0 ? '+' : '−';

        const properties = [
            weapon.isProficient ? 'Proficient' : null,
            weapon.isFinesse ? 'Finesse' : null,
            weapon.isThrown ? 'Thrown' : null,
            weapon.isBound ? 'Bound' : null,
            weapon.isUnarmed ? 'Unarmed' : null,
        ].filter(Boolean);

        return (
            <View key={weapon.id} style={cardStyle}>
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 12,
                    }}
                >
                    <View style={{ flex: 1, gap: 5 }}>
                        <Text
                            style={{
                                color: colors.text,
                                fontSize: 19,
                                fontWeight: '800',
                            }}
                        >
                            {weapon.name}
                        </Text>
                        <Text
                            style={{
                                color: colors.textSecondary,
                                fontSize: 12,
                            }}
                        >
                            {weapon.damageType}
                            {properties.length
                                ? ` · ${properties.join(' · ')}`
                                : ''}
                        </Text>
                        <Text
                            style={{
                                color: colors.textSecondary,
                                fontSize: 12,
                            }}
                        >

                            Attack Mod: {weapon.attackAbility.toUpperCase()} | Damage Mod: {weapon.damageAbility.toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View
                    style={{
                        flexDirection: 'row',
                        gap: 10,
                    }}
                >
                    <View
                        style={{
                            flex: 1,
                            padding: 12,
                            borderRadius: 10,
                            backgroundColor: colors.background,
                            borderWidth: 1,
                            borderColor: colors.border,
                            gap: 5,
                        }}
                    >
                        <Text style={labelStyle}>DAMAGE</Text>
                        <Text
                            style={{
                                color: colors.text,
                                fontSize: 21,
                                fontWeight: '800',
                            }}
                        >
                            {weapon.isUnarmed
                                ? Math.max(1, Number(weapon.damageDice) + damageBonus)
                                : `${weapon.damageDice}${damageBonus !== 0
                                    ? ` ${damageSign} ${Math.abs(damageBonus)}`
                                    : ''
                                }`}
                        </Text>
                        <Text
                            style={{
                                color: colors.textSecondary,
                                fontSize: 12,
                            }}
                        >
                            {weapon.damageType}
                        </Text>
                    </View>

                    <View
                        style={{
                            flex: 1,
                            padding: 12,
                            borderRadius: 10,
                            backgroundColor: colors.background,
                            borderWidth: 1,
                            borderColor: colors.border,
                            gap: 5,
                        }}
                    >
                        <Text style={labelStyle}>Attack Roll</Text>
                        <Text
                            style={{
                                color: colors.text,
                                fontSize: 21,
                                fontWeight: '800',
                            }}
                        >
                            {attackBonus >= 0 ? '+' : ''}
                            {attackBonus}
                        </Text>
                    </View>


                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {renderButton('Edit', () => openEdit(weapon), true)}
                    {renderButton('Delete', () => deleteWeapon(weapon))}
                </View>
            </View>
        );
    }

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
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                    }}
                >
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text
                            style={{
                                color: colors.accent,
                                fontSize: 12,
                                fontWeight: '800',
                                letterSpacing: 2,
                            }}
                        >
                            WEAPONS
                        </Text>
                        <Text
                            style={{
                                color: colors.textSecondary,
                                fontSize: 13,
                            }}
                        >
                            {weapons.length} weapon
                            {weapons.length === 1 ? '' : 's'}
                        </Text>
                    </View>

                    <View style={{ minWidth: 120 }}>
                        {renderButton('+ Add Weapon', openAdd, true)}
                    </View>
                </View>

                {weapons.length > 0 ? (
                    <View style={{ gap: 12 }}>
                        {weapons.map(renderWeapon)}
                    </View>
                ) : (
                    <View
                        style={{
                            padding: 22,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.backgroundElement,
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <Text
                            style={{
                                color: colors.text,
                                fontWeight: '700',
                                fontSize: 15,
                            }}
                        >
                            No weapons yet
                        </Text>
                        <Text
                            style={{
                                color: colors.textSecondary,
                                fontSize: 13,
                                textAlign: 'center',
                            }}
                        >
                            Add a weapon to configure its attack and damage.
                        </Text>
                    </View>
                )}
            </View>

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!saving) setModalVisible(false);
                }}
            >
                <View
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        padding: 16,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                    }}
                >
                    <View
                        style={{
                            maxHeight: '90%',
                            width: '100%',
                            maxWidth: 600,
                            alignSelf: 'center',
                            borderRadius: 16,
                            backgroundColor: colors.background,
                            borderWidth: 1,
                            borderColor: colors.border,
                            overflow: 'hidden',
                        }}
                    >
                        <View
                            style={{
                                padding: 18,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                            }}
                        >
                            <Text
                                style={{
                                    color: colors.text,
                                    fontSize: 20,
                                    fontWeight: '800',
                                }}
                            >
                                {editingId ? 'Edit Weapon' : 'Add Weapon'}
                            </Text>
                        </View>

                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{
                                padding: 18,
                                gap: 16,
                            }}
                        >
                            {renderField(
                                'WEAPON NAME',
                                form.name,
                                (value) => updateForm('name', value),
                                'e.g. Knife',
                            )}

                            {renderAbilityPicker(
                                'ATTACK ABILITY',
                                form.attackAbility,
                                (value) => updateForm('attackAbility', value),
                            )}

                            {renderAbilityPicker(
                                'DAMAGE ABILITY',
                                form.damageAbility,
                                (value) => updateForm('damageAbility', value),
                            )}

                            <View
                                style={{
                                    flexDirection: 'row',
                                    gap: 10,
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    {renderField(
                                        'EXTRA ATTACK BONUS',
                                        form.attackBonus,
                                        (value) =>
                                            updateForm(
                                                'attackBonus',
                                                value.replace(/[^0-9-]/g, ''),
                                            ),
                                        'e.g. 2',
                                        'numeric',
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    {renderField(
                                        'EXTRA DAMAGE BONUS',
                                        form.damageBonus,
                                        (value) =>
                                            updateForm(
                                                'damageBonus',
                                                value.replace(/[^0-9-]/g, ''),
                                            ),
                                        'e.g. 2',
                                        'numeric',
                                    )}
                                </View>
                            </View>

                            <View
                                style={{
                                    flexDirection: 'row',
                                    gap: 10,
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    {renderField(
                                        'DAMAGE DICE / BASE',
                                        form.damageDice,
                                        (value) =>
                                            updateForm('damageDice', value),
                                        'e.g. 1d8 or 1',
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    {renderField(
                                        'DAMAGE TYPE',
                                        form.damageType,
                                        (value) =>
                                            updateForm('damageType', value),
                                        'e.g. slashing',
                                    )}
                                </View>
                            </View>

                            <Text style={labelStyle}>PROPERTIES</Text>

                            {renderToggle(
                                'Proficient',
                                form.isProficient,
                                () =>
                                    updateForm(
                                        'isProficient',
                                        !form.isProficient,
                                    ),
                            )}

                            {renderToggle(
                                'Finesse',
                                form.isFinesse,
                                () =>
                                    updateForm('isFinesse', !form.isFinesse),
                            )}

                            {renderToggle(
                                'Thrown',
                                form.isThrown,
                                () =>
                                    updateForm('isThrown', !form.isThrown),
                            )}

                            {renderToggle(
                                'Bound',
                                form.isBound,
                                () => updateForm('isBound', !form.isBound),
                            )}

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    {renderButton(
                                        'Cancel',
                                        () => setModalVisible(false),
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    {renderButton(
                                        saving ? 'Saving…' : 'Save Weapon',
                                        () => void saveWeapon(),
                                        true,
                                    )}
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </BlurView>
    );
}
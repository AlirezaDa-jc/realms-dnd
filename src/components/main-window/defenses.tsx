import { Colors } from '@/constants/theme';
import type { Character } from '@/models/character';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    useColorScheme,
    View,
} from 'react-native';

type DefenseAttribute =
    | 'damageResistances'
    | 'damageImmunities'
    | 'damageVulnerabilities'
    | 'conditionImmunities';

type DefenseGroup = {
    heading: string;
    attribute: DefenseAttribute;
};

type DefensesProps = {
    character: Character;
    onUpdate: (character: Character) => Promise<void>;
};

const DEFENSE_GROUPS: DefenseGroup[] = [
    {
        heading: 'Damage Resistances',
        attribute: 'damageResistances',
    },
    {
        heading: 'Damage Immunities',
        attribute: 'damageImmunities',
    },
    {
        heading: 'Damage Vulnerabilities',
        attribute: 'damageVulnerabilities',
    },
    {
        heading: 'Condition Immunities',
        attribute: 'conditionImmunities',
    },
];

export default function Defenses({
    character,
    onUpdate,
}: DefensesProps) {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedAttribute, setSelectedAttribute] =
        useState<DefenseAttribute>('damageResistances');
    const [newItem, setNewItem] = useState('');
    const [saving, setSaving] = useState(false);

    const selectedGroup = DEFENSE_GROUPS.find(
        (group) => group.attribute === selectedAttribute,
    )!;

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
        input: {
            color: colors.text,
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 9,
            fontSize: 14,
        },
    };

    function openModal() {
        setSelectedAttribute('damageResistances');
        setNewItem('');
        setModalVisible(true);
    }

    function selectCategory(attribute: DefenseAttribute) {
        setSelectedAttribute(attribute);
        setNewItem('');
    }

async function addDefense() {
    const value = newItem.trim();

    if (!value || saving) return;

    const currentItems = character[selectedAttribute];

    const alreadyExists = currentItems.some(
        (item) => item.toLocaleLowerCase() === value.toLocaleLowerCase(),
    );

    if (alreadyExists) {
        Alert.alert('Already Exists', 'This defense already exists.');
        return;
    }

    setNewItem('');
    await updateDefenses([...currentItems, value]);
}

async function removeDefense(index: number) {
    if (saving) return;

    const updatedItems = character[selectedAttribute].filter(
        (_, i) => i !== index,
    );

    await updateDefenses(updatedItems);
}

    async function updateDefenses(values: string[]) {
    if (saving) return;

    const updatedCharacter = Object.assign(
        Object.create(Object.getPrototypeOf(character)),
        character,
        {
            [selectedAttribute]: values,
        },
    ) as Character;

    setSaving(true);

    try {
        await onUpdate(updatedCharacter);
    } catch (error) {
        Alert.alert(
            'Save failed',
            error instanceof Error
                ? error.message
                : 'Could not save defenses.',
        );
    } finally {
        setSaving(false);
        }
    }

    function closeModal() {
        if (saving) return;
        setModalVisible(false);
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
            <Text style={styles.title}>DEFENSES</Text>

            <View style={{ gap: 12 }}>
                {DEFENSE_GROUPS.map((group) => {
                    const items = character[group.attribute];
                    if (items.length == 0) {
                        return null;
                    }
                    return (
                        <View
                            key={group.attribute}
                            style={{
                                gap: 6,
                                paddingBottom: 10,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                            }}
                        >
                            {items.length > 0 && (
                                <Text style={styles.secondary}>
                                    {group.heading}
                                </Text>
                            )}

                            {items.length > 0 ? (
                                <View style={{ gap: 4 }}>
                                    {items.map((item, index) => (
                                        <Text
                                            key={`${item} -${index} `}
                                            style={styles.text}
                                        >
                                            {'• '}{item}
                                        </Text>
                                    ))}
                                </View>
                            ) : null}
                        </View>
                    );
                })}
            </View>

            <Pressable
                onPress={openModal}
                style={[styles.button, { alignSelf: 'flex-start' }]}
            >
                <Text style={styles.buttonText}>Edit Defenses</Text>
            </Pressable>

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={closeModal}
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
                            maxHeight: '85%',
                            padding: 20,
                            borderRadius: 16,
                            gap: 16,
                            backgroundColor: colors.background,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <Text style={styles.title}>Manage Defenses</Text>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8 }}
                        >
                            {DEFENSE_GROUPS.map((group) => {
                                const selected =
                                    selectedAttribute === group.attribute;

                                return (
                                    <Pressable
                                        key={group.attribute}
                                        onPress={() =>
                                            selectCategory(group.attribute)
                                        }
                                        disabled={saving}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 9,
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
                                        <Text
                                            style={{
                                                ...styles.secondary,
                                                color: selected
                                                    ? colors.text
                                                    : colors.textSecondary,
                                            }}
                                        >
                                            {group.heading}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        <Text style={styles.secondary}>
                            {selectedGroup.heading}
                        </Text>

                        <ScrollView
                            style={{ flexGrow: 0, maxHeight: 220 }}
                            contentContainerStyle={{ gap: 8 }}
                            keyboardShouldPersistTaps="handled"
                        >
                            {character[selectedAttribute].length === 0 ? (
                                <Text style={styles.secondary}>
                                    No defenses added.
                                </Text>
                            ) : (
                                character[selectedAttribute].map((item, index) => (
                                    <View
                                        key={`${item} -${index} `}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: 10,
                                            borderRadius: 8,
                                            backgroundColor:
                                                colors.backgroundElement,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                ...styles.text,
                                                flex: 1,
                                            }}
                                        >
                                            {item}
                                        </Text>

                                        <Pressable
                                            onPress={() =>
                                                removeDefense(index)
                                            }
                                            disabled={saving}
                                            style={[
                                                styles.button,
                                                {
                                                    backgroundColor:
                                                        colors.background,
                                                    borderWidth: 1,
                                                    borderColor:
                                                        colors.border,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={{
                                                    ...styles.buttonText,
                                                    color: colors.text,
                                                }}
                                            >
                                                Remove
                                            </Text>
                                        </Pressable>
                                    </View>
                                ))
                            )}
                        </ScrollView>

                        <View style={{ gap: 8 }}>
                            <Text style={styles.secondary}>
                                Add Defense
                            </Text>

                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                            >
                                <TextInput
                                    value={newItem}
                                    onChangeText={setNewItem}
                                    numberOfLines={1}
                                    placeholder="Enter damage type or condition..."
                                    placeholderTextColor={
                                        colors.textSecondary
                                    }
                                    style={{
                                        ...styles.input,
                                        flex: 1,
                                    }}
                                    editable={!saving}
                                    returnKeyType="done"
                                    onSubmitEditing={addDefense}
                                />

                            </View>
                        </View>

                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'flex-end',
                                gap: 8,
                            }}
                        >
                            <Pressable
                                onPress={closeModal}
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
                                onPress={addDefense}
                                disabled={saving || !newItem.trim()}
                                style={[
                                    styles.button,
                                    (!newItem.trim() || saving) && {
                                        opacity: 0.5,
                                    },
                                ]}
                            >
                                <Text style={styles.buttonText}>
                                    + Add
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </BlurView>
    );
}

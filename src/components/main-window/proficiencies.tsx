import { Colors } from '@/constants/theme';
import type { Character } from '@/models/character';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    Text,
    TextInput,
    useColorScheme,
    View,
} from 'react-native';

type ProficiencyAttribute =
    | 'languages'
    | 'weaponProficiencies'
    | 'toolProficiencies'
    | 'armorProficiencies';

type ProficiencyGroup = {
    heading: string;
    attribute: ProficiencyAttribute;
    singular: string;
};

type ProficienciesProps = {
    character: Character;
    onUpdate: (character: Character) => Promise<void>;
};

const PROFICIENCY_GROUPS: ProficiencyGroup[] = [
    {
        heading: 'Languages',
        attribute: 'languages',
        singular: 'Language',
    },
    {
        heading: 'Weapons',
        attribute: 'weaponProficiencies',
        singular: 'Weapon',
    },
    {
        heading: 'Tools',
        attribute: 'toolProficiencies',
        singular: 'Tool',
    },
    {
        heading: 'Armor',
        attribute: 'armorProficiencies',
        singular: 'Armor',
    },
];

export default function Proficiencies({
    character,
    onUpdate,
}: ProficienciesProps) {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedGroup, setSelectedGroup] =
        useState<ProficiencyGroup | null>(null);
    const [draftItems, setDraftItems] = useState<string[]>([]);
    const [newItem, setNewItem] = useState('');
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

    function openModal(group: ProficiencyGroup) {
        setSelectedGroup(group);
        setDraftItems([...character[group.attribute]]);
        setNewItem('');
        setModalVisible(true);
    }

    function addItem() {
        const value = newItem.trim();

        if (!value) return;

        const alreadyExists = draftItems.some(
            (item) => item.toLocaleLowerCase() === value.toLocaleLowerCase(),
        );

        if (alreadyExists) {
            Alert.alert(
                'Already exists',
                `${value} is already in this list.`,
            );
            return;
        }

        setDraftItems((items) => [...items, value]);
        setNewItem('');
    }

    function removeItem(index: number) {
        setDraftItems((items) => items.filter((_, i) => i !== index));
    }

    async function saveChanges() {
        if (!selectedGroup || saving) return;

        const updatedCharacter = Object.assign(
            Object.create(Object.getPrototypeOf(character)),
            character,
            {
                [selectedGroup.attribute]: [...draftItems],
            },
        ) as Character;

        setSaving(true);

        try {
            await onUpdate(updatedCharacter);
            setModalVisible(false);
            setSelectedGroup(null);
            setDraftItems([]);
            setNewItem('');
        } catch (error) {
            Alert.alert(
                'Save failed',
                error instanceof Error
                    ? error.message
                    : 'Could not save proficiencies.',
            );
        } finally {
            setSaving(false);
        }
    }

    function closeModal() {
        if (saving) return;

        setModalVisible(false);
        setSelectedGroup(null);
        setDraftItems([]);
        setNewItem('');
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
            <Text style={styles.title}>PROFICIENCIES</Text>

            <View style={{ gap: 12 }}>
                {PROFICIENCY_GROUPS.map((group) => {
                    const items = character[group.attribute];

                    return (
                        <View
                            key={group.attribute}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'flex-start',
                                gap: 10,
                                paddingVertical: 8,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                            }}
                        >
                            <Text
                                style={{
                                    ...styles.secondary,
                                    width: 76,
                                    paddingTop: 2,
                                }}
                            >
                                {group.heading}
                            </Text>

                            <Text
                                style={{
                                    ...styles.text,
                                    flex: 1,
                                    lineHeight: 20,
                                }}
                            >
                                {items.length > 0 ? items.join(', ') : 'None'}
                            </Text>

                            <Pressable
                                onPress={() => openModal(group)}
                                style={styles.button}
                            >
                                <Text style={styles.buttonText}>Edit</Text>
                            </Pressable>
                        </View>
                    );
                })}
            </View>

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
                        <Text style={styles.title}>
                            Edit {selectedGroup?.heading ?? 'Proficiencies'}
                        </Text>

                        <View style={{ gap: 8 }}>
                            <Text style={styles.secondary}>
                                Current items
                            </Text>

                            {draftItems.length === 0 ? (
                                <View
                                    style={{
                                        padding: 12,
                                        borderRadius: 8,
                                        backgroundColor:
                                            colors.backgroundElement,
                                    }}
                                >
                                    <Text style={styles.secondary}>
                                        No items added.
                                    </Text>
                                </View>
                            ) : (
                                <View style={{ gap: 8 }}>
                                    {draftItems.map((item, index) => (
                                        <View
                                            key={`${item}-${index}`}
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
                                                disabled={saving}
                                                onPress={() =>
                                                    removeItem(index)
                                                }
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
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={{ gap: 8 }}>
                            <Text style={styles.secondary}>
                                Add {selectedGroup?.singular ?? 'item'}
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
                                    placeholder={`Enter ${(
                                        selectedGroup?.singular ?? 'item'
                                    ).toLowerCase()}...`}
                                    placeholderTextColor={
                                        colors.textSecondary
                                    }
                                    style={{
                                        ...styles.input,
                                        flex: 1,
                                    }}
                                    editable={!saving}
                                    returnKeyType="done"
                                    onSubmitEditing={addItem}
                                />

                                <Pressable
                                    onPress={addItem}
                                    disabled={saving || !newItem.trim()}
                                    style={[
                                        styles.button,
                                        (!newItem.trim() || saving) && {
                                            opacity: 0.5,
                                        },
                                    ]}
                                >
                                    <Text style={styles.buttonText}>Add</Text>
                                </Pressable>
                            </View>
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
                                onPress={saveChanges}
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
        </BlurView>
    );
}

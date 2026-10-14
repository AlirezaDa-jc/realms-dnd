
import { Colors } from '@/constants/theme';
import type { Character } from '@/models/character';
import { SKILLS, type Skill } from '@/rules/dnd5e-2024';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    Text,
    useColorScheme,
    View
} from 'react-native';

type SkillsProps = {
    character: Character;
    onUpdate: (character: Character) => Promise<void>;
    onAddBonus?: (skill: Skill, displayName: string) => void;
};

const SKILL_NAMES: Record<Skill, string> = {
    acrobatics: 'Acrobatics',
    animal_handling: 'Animal Handling',
    arcana: 'Arcana',
    athletics: 'Athletics',
    deception: 'Deception',
    history: 'History',
    insight: 'Insight',
    intimidation: 'Intimidation',
    investigation: 'Investigation',
    medicine: 'Medicine',
    nature: 'Nature',
    perception: 'Perception',
    performance: 'Performance',
    persuasion: 'Persuasion',
    religion: 'Religion',
    sleight_of_hand: 'Sleight of Hand',
    stealth: 'Stealth',
    survival: 'Survival',
};

const PROFICIENCY_OPTIONS = [
    { value: 0, label: 'None' },
    { value: 1, label: 'Proficient' },
    { value: 2, label: 'Expertise' },
] as const;

export default function Skills({
    character,
    onUpdate,
    onAddBonus,
}: SkillsProps) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
    const [selectedProficiency, setSelectedProficiency] = useState(0);
    const [saving, setSaving] = useState(false);

    const styles = {
        card: {
            backgroundColor: colors.backgroundElement,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 12,
            padding: 14,
            gap: 10,
        } as const,
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
            color: scheme === 'dark' ? '#11100F' : '#FFFFFF',
            fontSize: 12,
            fontWeight: '600' as const,
        },
    };

    function openProficiencyModal(skill: Skill) {
        setSelectedSkill(skill);
        setSelectedProficiency(character.skillProficiencies[skill]);
        setModalVisible(true);
    }

    async function saveProficiency() {
        if (selectedSkill === null) return;

        const updatedCharacter = Object.assign(
            Object.create(Object.getPrototypeOf(character)),
            character,
            {
                skillProficiencies: {
                    ...character.skillProficiencies,
                },
            },
        ) as Character;

        try {
            updatedCharacter.setSkillProficiency(
                selectedSkill,
                selectedProficiency as 0 | 1 | 2,
            );

            setSaving(true);
            await onUpdate(updatedCharacter);
            setModalVisible(false);
            setSelectedSkill(null);
        } catch (error) {
            Alert.alert(
                'Save failed',
                error instanceof Error
                    ? error.message
                    : 'Could not save proficiency.',
            );
        } finally {
            setSaving(false);
        }
    }

    function getProficiencyLabel(level: number): string {
        if (level === 1) return 'Proficient';
        if (level === 2) return 'Expertise';
        return '';
    }

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
                marginTop: 16,
            }}
        >
            <View style={{ gap: 12 }}>
                <Text style={styles.title}>SKILLS</Text>

                {SKILLS.map((skill) => {
                    const displayName = SKILL_NAMES[skill];
                    const proficiency =
                        character.skillProficiencies[skill];
                    const bonus = character.skillBonus(skill);

                    return (
                        <View
                            key={skill}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                paddingVertical: 5,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                            }}
                        >
                            <Text
                                style={{
                                    ...styles.text,
                                    flex: 1,
                                }}
                            >
                                {displayName}
                            </Text>

                            <Text
                                numberOfLines={1}
                                style={{
                                    ...styles.secondary,
                                    minWidth: 65,
                                    textAlign: 'center',
                                }}
                            >
                                {getProficiencyLabel(proficiency)}
                            </Text>

                            <Pressable
                                onPress={() =>
                                    openProficiencyModal(skill)
                                }
                                style={styles.button}
                            >
                                <Text style={styles.buttonText}>Edit</Text>
                            </Pressable>

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

                            <Pressable
                                onPress={() =>
                                    onAddBonus?.(skill, displayName)
                                }
                                style={[
                                    styles.button,
                                    !onAddBonus && {
                                        opacity: 0.5,
                                    },
                                ]}
                                disabled={!onAddBonus}
                            >
                                <Text style={styles.buttonText}>Bonus</Text>
                            </Pressable>
                        </View>
                    );
                })}
            </View>

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
                        <Text style={styles.title}>
                            Proficiency —{' '}
                            {selectedSkill
                                ? SKILL_NAMES[selectedSkill]
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
                                onPress={() => setModalVisible(false)}
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
                                        color: '#FFF'
                                    }}
                                >
                                    Cancel
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={saveProficiency}
                                disabled={saving}
                                style={styles.button}
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

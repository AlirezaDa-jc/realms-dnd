
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import {
    ABILITIES,
    CHARACTER_CLASSES,
    MAX_CHARACTER_LEVEL,
    SPECIES_GROUPS,
} from '@/data/character-options';
import { useColorScheme } from 'react-native';

type AbilityKey = (typeof ABILITIES)[number]['key'];
type AbilityScores = Record<AbilityKey, string>;

export type CharacterClassLevelForm = {
    characterClass: string;
    subClass: string;
    level: string;
};

export type CharacterFormValues = {
    name: string;
    species: string;
    classLevels: CharacterClassLevelForm[];
    background: string;
    abilities: AbilityScores;
    maxHp: string;
    currentHp: string;
    speed: string;
};

type CharacterFormProps = {
    mode: 'create' | 'edit';
    initialValues?: Partial<CharacterFormValues>;
    onSubmit: (values: CharacterFormValues) => void;
    onCancel: () => void;
};

const EMPTY_ABILITIES: AbilityScores = {
    str: '',
    dex: '',
    con: '',
    int: '',
    wis: '',
    cha: '',
};

const EMPTY_VALUES: CharacterFormValues = {
    name: '',
    species: '',
    classLevels: [],
    background: '',
    abilities: EMPTY_ABILITIES,
    maxHp: '',
    currentHp: '',
    speed: '',
};

export default function CharacterForm({
    mode,
    initialValues,
    onSubmit,
    onCancel,
}: CharacterFormProps) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [values, setValues] = useState<CharacterFormValues>(() => ({
        ...EMPTY_VALUES,
        ...initialValues,
        abilities: {
            ...EMPTY_ABILITIES,
            ...initialValues?.abilities,
        },
        classLevels: initialValues?.classLevels
            ? initialValues.classLevels.map((entry) => ({ ...entry }))
            : [],
    }));

    // Tracks which class cards currently display a subclass field.
    const [subclassVisible, setSubclassVisible] = useState<
        Record<number, boolean>
    >(() =>
        Object.fromEntries(
            (initialValues?.classLevels ?? []).map((entry, index) => [
                index,
                Boolean(entry.subClass?.trim()),
            ]),
        ),
    );

    const [selectedClassIndex, setSelectedClassIndex] = useState<number | null>(
        null,
    );
    const [speciesModalVisible, setSpeciesModalVisible] = useState(false);
    const [classModalVisible, setClassModalVisible] = useState(false);

    function updateField<K extends keyof CharacterFormValues>(
        key: K,
        value: CharacterFormValues[K],
    ) {
        setValues((previous) => ({ ...previous, [key]: value }));
    }

    function updateAbility(key: AbilityKey, value: string) {
        setValues((previous) => ({
            ...previous,
            abilities: {
                ...previous.abilities,
                [key]: value.replace(/[^0-9]/g, ''),
            },
        }));
    }

    function addClass() {
        setValues((previous) => ({
            ...previous,
            classLevels: [
                ...previous.classLevels,
                {
                    characterClass: '',
                    subClass: '',
                    level: '1',
                },
            ],
        }));

        // The new class has no subclass until the user adds one.
        setSubclassVisible((previous) => ({
            ...previous,
            [values.classLevels.length]: false,
        }));
    }

    function updateClassLevel(
        index: number,
        key: keyof CharacterClassLevelForm,
        value: string,
    ) {
        setValues((previous) => ({
            ...previous,
            classLevels: previous.classLevels.map((entry, entryIndex) =>
                entryIndex === index
                    ? { ...entry, [key]: value }
                    : entry,
            ),
        }));
    }

    function addSubclass(index: number) {
        setSubclassVisible((previous) => ({
            ...previous,
            [index]: true,
        }));
    }

    function removeSubclass(index: number) {
        updateClassLevel(index, 'subClass', '');

        setSubclassVisible((previous) => ({
            ...previous,
            [index]: false,
        }));
    }

    function removeClass(index: number) {
        setValues((previous) => ({
            ...previous,
            classLevels: previous.classLevels.filter(
                (_, entryIndex) => entryIndex !== index,
            ),
        }));

        // Shift visibility entries to match the remaining class cards.
        setSubclassVisible((previous) => {
            const next: Record<number, boolean> = {};

            Object.entries(previous).forEach(([key, visible]) => {
                const oldIndex = Number(key);

                if (oldIndex < index) {
                    next[oldIndex] = visible;
                } else if (oldIndex > index) {
                    next[oldIndex - 1] = visible;
                }
            });

            return next;
        });
    }

    function validateForm(): boolean {
        if (!values.name.trim()) {
            Alert.alert('Missing Name', 'Enter a character name.');
            return false;
        }

        if (values.classLevels.length === 0) {
            Alert.alert(
                'Missing Class',
                'Add at least one class and enter its level.',
            );
            return false;
        }

        const numericFields: [string, string, number, number][] = [
            ...ABILITIES.map(
                ({ label, key }) =>
                    [label, values.abilities[key], 1, 30] as [
                        string,
                        string,
                        number,
                        number,
                    ],
            ),
            ['Maximum HP', values.maxHp, 0, 999],
            ['Current HP', values.currentHp, 0, 999],
            ['Speed', values.speed, 0, 999],
        ];

        for (const [label, value, minimum, maximum] of numericFields) {
            if (!value.trim()) {
                Alert.alert('Missing Value', `Enter a value for ${label}.`);
                return false;
            }

            const number = Number(value);

            if (
                !Number.isInteger(number) ||
                number < minimum ||
                number > maximum
            ) {
                Alert.alert(
                    'Invalid Value',
                    `${label} must be an integer between ${minimum} and ${maximum}.`,
                );
                return false;
            }
        }

        for (const entry of values.classLevels) {
            if (!entry.characterClass.trim()) {
                Alert.alert(
                    'Missing Class',
                    'Select a class for every class entry.',
                );
                return false;
            }

            const classLevel = Number(entry.level);

            if (
                !Number.isInteger(classLevel) ||
                classLevel < 1 ||
                classLevel > MAX_CHARACTER_LEVEL
            ) {
                Alert.alert(
                    'Invalid Class Level',
                    `Each class level must be between 1 and ${MAX_CHARACTER_LEVEL}.`,
                );
                return false;
            }
        }

        const totalLevel = values.classLevels.reduce(
            (total, entry) => total + Number(entry.level),
            0,
        );

        if (totalLevel > MAX_CHARACTER_LEVEL) {
            Alert.alert(
                'Invalid Total Level',
                `Combined class levels cannot exceed ${MAX_CHARACTER_LEVEL}.`,
            );
            return false;
        }

        const normalizedClasses = values.classLevels.map((entry) =>
            entry.characterClass.trim().toLocaleLowerCase(),
        );

        if (new Set(normalizedClasses).size !== normalizedClasses.length) {
            Alert.alert(
                'Duplicate Class',
                'Choose each class only once and put its total levels in that entry.',
            );
            return false;
        }

        if (Number(values.currentHp) > Number(values.maxHp)) {
            Alert.alert(
                'Invalid HP',
                'Current HP cannot exceed Maximum HP.',
            );
            return false;
        }

        onSubmit({
            ...values,
            name: values.name.trim(),
            background: values.background.trim(),
            classLevels: values.classLevels.map((entry) => ({
                characterClass: entry.characterClass.trim(),
                subClass: entry.subClass ? entry.subClass.trim() : '',
                level: String(Number(entry.level)),
            })),
        });

        return true;
    }

    const inputStyle = [
        styles.input,
        {
            color: colors.text,
            backgroundColor: colors.backgroundElement,
            borderColor: colors.border,
        },
    ];

    function renderPickerModal(
        visible: boolean,
        title: string,
        options: readonly string[],
        selectedValue: string,
        onSelect: (value: string) => void,
        onClose: () => void,
    ) {
        return (
            <Modal
                visible={visible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={onClose}>
                <View
                    style={[
                        styles.modalContainer,
                        { backgroundColor: colors.background },
                    ]}>
                    <View style={styles.modalHeader}>
                        <Text
                            style={[
                                styles.modalTitle,
                                { color: colors.text },
                            ]}>
                            {title}
                        </Text>

                        <Pressable onPress={onClose} hitSlop={12}>
                            <Text
                                style={[
                                    styles.closeText,
                                    { color: colors.accent },
                                ]}>
                                Close
                            </Text>
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={styles.modalList}>
                        {options.map((option) => {
                            const selected = option === selectedValue;

                            return (
                                <Pressable
                                    key={option}
                                    onPress={() => {
                                        onSelect(option);
                                        onClose();
                                    }}
                                    style={[
                                        styles.option,
                                        {
                                            backgroundColor: selected
                                                ? colors.backgroundSelected
                                                : colors.backgroundElement,
                                            borderColor: colors.border,
                                        },
                                    ]}>
                                    <Text
                                        style={[
                                            styles.optionText,
                                            { color: colors.text },
                                        ]}>
                                        {option}
                                    </Text>

                                    {selected && (
                                        <Text style={{ color: colors.accent }}>
                                            ✓
                                        </Text>
                                    )}
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            </Modal>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[
                styles.screen,
                { backgroundColor: colors.background },
            ]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.content}>
                <Text style={[styles.eyebrow, { color: colors.accent }]}>
                    {mode === 'create'
                        ? 'BEGIN YOUR ADVENTURE'
                        : 'UPDATE YOUR HERO'}
                </Text>

                <Text style={[styles.title, { color: colors.text }]}>
                    {mode === 'create'
                        ? 'Create Character'
                        : 'Edit Character'}
                </Text>

                <Text
                    style={[
                        styles.subtitle,
                        { color: colors.textSecondary },
                    ]}>
                    {mode === 'create'
                        ? 'Define your hero before entering the realm.'
                        : 'Update your character details.'}
                </Text>

                <SectionTitle title="Identity" colors={colors} />

                <Field label="Character Name" colors={colors}>
                    <TextInput
                        value={values.name}
                        onChangeText={(value) => updateField('name', value)}
                        placeholder="Enter character name"
                        placeholderTextColor={colors.textSecondary}
                        style={inputStyle}
                        maxLength={100}
                        returnKeyType="next"
                    />
                </Field>

                <Field label="Species" colors={colors}>
                    <Pressable
                        onPress={() => setSpeciesModalVisible(true)}
                        style={[
                            styles.picker,
                            {
                                backgroundColor: colors.backgroundElement,
                                borderColor: colors.border,
                            },
                        ]}>
                        <Text
                            style={{
                                color: values.species
                                    ? colors.text
                                    : colors.textSecondary,
                            }}>
                            {values.species || 'Select species'}
                        </Text>

                        <Text style={{ color: colors.textSecondary }}>
                            ⌄
                        </Text>
                    </Pressable>
                </Field>

                <SectionTitle title="Classes" colors={colors} />

                <Text
                    style={[
                        styles.helper,
                        { color: colors.textSecondary },
                    ]}>
                    Add each class and its level. Add a subclass when your
                    character qualifies for one.
                </Text>

                {values.classLevels.map((entry, index) => (
                    <View
                        key={index}
                        style={[
                            styles.classCard,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.backgroundElement,
                            },
                        ]}>
                        <View style={styles.classCardHeader}>
                            <Text
                                style={[
                                    styles.classCardTitle,
                                    { color: colors.text },
                                ]}>
                                Class {index + 1}
                            </Text>

                            <Pressable
                                onPress={() => removeClass(index)}
                                hitSlop={8}>
                                <Text style={styles.removeText}>Remove</Text>
                            </Pressable>
                        </View>

                        <Field label="Class" colors={colors}>
                            <Pressable
                                onPress={() => {
                                    setSelectedClassIndex(index);
                                    setClassModalVisible(true);
                                }}
                                style={[
                                    styles.picker,
                                    {
                                        backgroundColor: colors.background,
                                        borderColor: colors.border,
                                    },
                                ]}>
                                <Text
                                    style={{
                                        color: entry.characterClass
                                            ? colors.text
                                            : colors.textSecondary,
                                    }}>
                                    {entry.characterClass || 'Select class'}
                                </Text>

                                <Text style={{ color: colors.textSecondary }}>
                                    ⌄
                                </Text>
                            </Pressable>
                        </Field>

                        <Field label="Class Level" colors={colors}>
                            <TextInput
                                value={entry.level}
                                onChangeText={(value) =>
                                    updateClassLevel(
                                        index,
                                        'level',
                                        value.replace(/[^0-9]/g, ''),
                                    )
                                }
                                keyboardType="number-pad"
                                placeholder="1"
                                placeholderTextColor={colors.textSecondary}
                                style={inputStyle}
                                maxLength={2}
                            />
                        </Field>

                        {subclassVisible[index] ? (
                            <>
                                <Field label="Subclass" colors={colors}>
                                    <TextInput
                                        value={entry.subClass}
                                        onChangeText={(value) =>
                                            updateClassLevel(
                                                index,
                                                'subClass',
                                                value,
                                            )
                                        }
                                        placeholder="Enter subclass"
                                        placeholderTextColor={
                                            colors.textSecondary
                                        }
                                        style={inputStyle}
                                        maxLength={100}
                                    />
                                </Field>

                                <Pressable
                                    onPress={() => removeSubclass(index)}
                                    style={styles.subclassAction}>
                                    <Text
                                        style={[
                                            styles.subclassActionText,
                                            { color: colors.textSecondary },
                                        ]}>
                                        Remove Subclass
                                    </Text>
                                </Pressable>
                            </>
                        ) : (
                            <Pressable
                                onPress={() => addSubclass(index)}
                                style={[
                                    styles.addSubclassButton,
                                    {
                                        borderColor: colors.border,
                                        backgroundColor: colors.background,
                                    },
                                ]}>
                                <Text
                                    style={{
                                        color: colors.accent,
                                        fontWeight: '700',
                                    }}>
                                    + Add Subclass
                                </Text>
                            </Pressable>
                        )}
                    </View>
                ))}

                <Pressable
                    onPress={addClass}
                    style={[
                        styles.addClassButton,
                        {
                            borderColor: colors.border,
                            backgroundColor: colors.backgroundElement,
                        },
                    ]}>
                    <Text
                        style={{
                            color: colors.accent,
                            fontWeight: '700',
                            fontSize: 15,
                        }}>
                        + Add Class
                    </Text>
                </Pressable>

                <Field label="Background" colors={colors}>
                    <TextInput
                        value={values.background}
                        onChangeText={(value) =>
                            updateField('background', value)
                        }
                        placeholder="e.g. Soldier, Sage, Criminal"
                        placeholderTextColor={colors.textSecondary}
                        style={inputStyle}
                        maxLength={100}
                    />
                </Field>

                <SectionTitle title="Ability Scores" colors={colors} />

                <Text
                    style={[
                        styles.helper,
                        { color: colors.textSecondary },
                    ]}>
                    Enter a score from 1 to 30 for each ability.
                </Text>

                <View style={styles.abilityGrid}>
                    {ABILITIES.map(({ label, key }) => (
                        <View key={key} style={styles.abilityItem}>
                            <Text
                                style={[
                                    styles.abilityLabel,
                                    { color: colors.text },
                                ]}>
                                {label}
                            </Text>

                            <TextInput
                                value={values.abilities[key]}
                                onChangeText={(value) =>
                                    updateAbility(key, value)
                                }
                                keyboardType="number-pad"
                                placeholder="—"
                                placeholderTextColor={colors.textSecondary}
                                style={[inputStyle, styles.abilityInput]}
                                textAlign="center"
                                maxLength={2}
                            />
                        </View>
                    ))}
                </View>

                <SectionTitle title="Combat" colors={colors} />

                <View style={styles.combatGrid}>
                    <View style={styles.combatItem}>
                        <Field label="Maximum HP" colors={colors}>
                            <TextInput
                                value={values.maxHp}
                                onChangeText={(value) =>
                                    updateField(
                                        'maxHp',
                                        value.replace(/[^0-9]/g, ''),
                                    )
                                }
                                keyboardType="number-pad"
                                placeholder="—"
                                placeholderTextColor={colors.textSecondary}
                                style={inputStyle}
                                maxLength={3}
                            />
                        </Field>
                    </View>

                    <View style={styles.combatItem}>
                        <Field label="Current HP" colors={colors}>
                            <TextInput
                                value={values.currentHp}
                                onChangeText={(value) =>
                                    updateField(
                                        'currentHp',
                                        value.replace(/[^0-9]/g, ''),
                                    )
                                }
                                keyboardType="number-pad"
                                placeholder="—"
                                placeholderTextColor={colors.textSecondary}
                                style={inputStyle}
                                maxLength={3}
                            />
                        </Field>
                    </View>
                </View>

                <Field label="Speed (ft)" colors={colors}>
                    <TextInput
                        value={values.speed}
                        onChangeText={(value) =>
                            updateField(
                                'speed',
                                value.replace(/[^0-9]/g, ''),
                            )
                        }
                        keyboardType="number-pad"
                        placeholder="—"
                        placeholderTextColor={colors.textSecondary}
                        style={inputStyle}
                        maxLength={3}
                    />
                </Field>

                <Pressable
                    onPress={validateForm}
                    style={[
                        styles.primaryButton,
                        { backgroundColor: colors.accent },
                    ]}>
                    <Text style={styles.primaryButtonText}>
                        {mode === 'create'
                            ? 'Create Character'
                            : 'Save Changes'}
                    </Text>
                </Pressable>

                <Pressable onPress={onCancel} style={styles.cancelButton}>
                    <Text
                        style={[
                            styles.cancelText,
                            { color: colors.textSecondary },
                        ]}>
                        Cancel
                    </Text>
                </Pressable>
            </ScrollView>

            {renderPickerModal(
                speciesModalVisible,
                'Choose Species',
                SPECIES_GROUPS
                    .flatMap((group) => group.options)
                    .sort((a, b) => a.localeCompare(b)),
                values.species,
                (value) => updateField('species', value),
                () => setSpeciesModalVisible(false),
            )}

            {renderPickerModal(
                classModalVisible,
                'Choose Class',
                CHARACTER_CLASSES,
                selectedClassIndex !== null
                    ? values.classLevels[selectedClassIndex]?.characterClass ?? ''
                    : '',
                (value) => {
                    if (selectedClassIndex !== null) {
                        updateClassLevel(
                            selectedClassIndex,
                            'characterClass',
                            value,
                        );
                    }
                },
                () => {
                    setClassModalVisible(false);
                    setSelectedClassIndex(null);
                },
            )}
        </KeyboardAvoidingView>
    );
}

function SectionTitle({
    title,
    colors,
}: {
    title: string;
    colors: (typeof Colors)['light'];
}) {
    return (
        <Text
            style={[
                styles.sectionTitle,
                {
                    color: colors.text,
                    borderBottomColor: colors.border,
                },
            ]}>
            {title}
        </Text>
    );
}

function Field({
    label,
    colors,
    children,
}: {
    label: string;
    colors: (typeof Colors)['light'];
    children: React.ReactNode;
}) {
    return (
        <View style={styles.field}>
            <Text
                style={[
                    styles.label,
                    { color: colors.textSecondary },
                ]}>
                {label}
            </Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    content: { padding: Spacing.four, paddingBottom: 48 },
    eyebrow: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: Spacing.two,
    },
    title: { fontSize: 30, fontWeight: '700' },
    subtitle: {
        fontSize: 14,
        lineHeight: 21,
        marginTop: Spacing.two,
        marginBottom: Spacing.four,
    },
    sectionTitle: {
        fontSize: 19,
        fontWeight: '700',
        paddingBottom: Spacing.two,
        marginTop: Spacing.four,
        marginBottom: Spacing.three,
        borderBottomWidth: 1,
    },
    field: { marginBottom: Spacing.three },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: Spacing.two,
    },
    input: {
        minHeight: 48,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        fontSize: 15,
    },
    picker: {
        minHeight: 48,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    helper: { fontSize: 12, marginBottom: Spacing.three },
    classCard: {
        padding: 12,
        marginBottom: Spacing.three,
        borderWidth: 1,
        borderRadius: 10,
    },
    classCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.three,
    },
    classCardTitle: { fontSize: 16, fontWeight: '700' },
    removeText: { color: '#D9534F', fontWeight: '700' },
    addSubclassButton: {
        minHeight: 42,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.two,
    },
    subclassAction: {
        alignSelf: 'flex-start',
        paddingVertical: Spacing.two,
        marginBottom: Spacing.two,
    },
    subclassActionText: {
        fontSize: 12,
        fontWeight: '600',
    },
    addClassButton: {
        minHeight: 48,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.three,
    },
    abilityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: Spacing.three,
    },
    abilityItem: { width: '31%' },
    abilityLabel: {
        textAlign: 'center',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: Spacing.two,
    },
    abilityInput: {
        paddingHorizontal: 4,
        textAlign: 'center',
    },
    combatGrid: { flexDirection: 'row', gap: Spacing.three },
    combatItem: { flex: 1 },
    primaryButton: {
        minHeight: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.four,
    },
    primaryButtonText: {
        color: '#11100F',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelButton: {
        alignItems: 'center',
        paddingVertical: Spacing.three,
    },
    cancelText: { fontSize: 14, fontWeight: '600' },
    modalContainer: {
        flex: 1,
        paddingTop: Spacing.four,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.three,
    },
    modalTitle: { fontSize: 22, fontWeight: '700' },
    closeText: { fontSize: 15, fontWeight: '600' },
    modalList: {
        padding: Spacing.three,
        gap: Spacing.two,
    },
    option: {
        minHeight: 48,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: Spacing.three,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    optionText: { fontSize: 15 },
});

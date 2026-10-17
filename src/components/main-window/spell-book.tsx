import { useDialog } from '@/components/dialog/realms-dialog';
import { Colors } from '@/constants/theme';
import type { Character } from '@/models/character';
import { Spell } from '@/models/spell';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useMemo, useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TextInput,
    useColorScheme,
    View,
} from 'react-native';

type SpellbookProps = {
    character: Character;
    onUpdate: (character: Character) => Promise<void>;
};

type SpellForm = {
    name: string;
    sourceClass: string;
    level: string;
    school: string;
    castingTime: string;
    range: string;
    components: string;
    duration: string;
    concentration: boolean;
    ritual: boolean;
    description: string;
};

const EMPTY_FORM: SpellForm = {
    name: '',
    sourceClass: '',
    level: '0',
    school: '',
    castingTime: 'Action',
    range: '',
    components: '',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    description: '',
};

function cloneCharacter(
    character: Character,
    overrides: Partial<Character>,
): Character {
    return Object.assign(
        Object.create(Object.getPrototypeOf(character)),
        character,
        overrides,
    ) as Character;
}

function cloneSpell(spell: Spell): Spell {
    return Object.assign(
        Object.create(Object.getPrototypeOf(spell)),
        spell,
    ) as Spell;
}

export default function SpellbookCard({
    character,
    onUpdate,
}: SpellbookProps) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const { showInfo, showConfirm } = useDialog();

    const [addVisible, setAddVisible] = useState(false);
    const [editingSpell, setEditingSpell] = useState<Spell | null>(null);
    const [prepareVisible, setPrepareVisible] = useState(false);
    const [castSpell, setCastSpell] = useState<Spell | null>(null);
    const [castingLevel, setCastingLevel] = useState<number | null>(null);
    const [form, setForm] = useState<SpellForm>(EMPTY_FORM);
    const [preparedDraft, setPreparedDraft] = useState<Record<string, boolean>>(
        {},
    );
    const [saving, setSaving] = useState(false);

    const spells = character.spellbook.spells;

    const characterClasses = character.classLevels.map(
        (entry) => entry.characterClass,
    );

    const preparedSpells = useMemo(
        () => spells.filter((spell) => spell.prepared),
        [spells],
    );

    const availableLevels = useMemo(() => {
        if (!castSpell || castSpell.level === 0) return [];

        return Object.values(character.spellSlots)
            .filter(
                (slot) =>
                    slot.level >= castSpell.level &&
                    slot.maximum > 0 &&
                    slot.current > 0,
            )
            .map((slot) => slot.level)
            .sort((a, b) => a - b);
    }, [character.spellSlots, castSpell]);

    const openEditSpell = (spell: Spell) => {
        setEditingSpell(spell);
        setForm({
            name: spell.name,
            sourceClass: spell.sourceClass ?? characterClasses[0] ?? '',
            level: String(spell.level),
            school: spell.school ?? '',
            castingTime: spell.castingTime ?? '',
            range: spell.range ?? '',
            components: spell.components ?? '',
            duration: spell.duration ?? '',
            concentration: spell.concentration,
            ritual: spell.ritual,
            description: spell.description ?? '',
        });
        setAddVisible(true);
    };

    const closeSpellForm = () => {
        if (saving) return;

        setAddVisible(false);
        setEditingSpell(null);
        setForm(EMPTY_FORM);
    };

    const updateForm = <K extends keyof SpellForm>(
        key: K,
        value: SpellForm[K],
    ) => {
        setForm((previous) => ({ ...previous, [key]: value }));
    };

    const persist = async (updated: Character) => {
        setSaving(true);

        try {
            await onUpdate(updated);
            return true;
        } catch (error) {
            showInfo(
                'Save Failed',
                error instanceof Error
                    ? error.message
                    : 'The character could not be saved.',
            );
            return false;
        } finally {
            setSaving(false);
        }
    };

    const submitSpell = async () => {
        if (saving) return;

        const name = form.name.trim();
        const level = Number(form.level);

        if (!name) {
            showInfo('Missing Spell Name', 'Enter a spell name first.');
            return;
        }

        if (
            !form.sourceClass ||
            !characterClasses.includes(form.sourceClass)
        ) {
            showInfo(
                'Missing Spellcasting Class',
                'Select which class this spell belongs to.',
            );
            return;
        }

        if (!Number.isInteger(level) || level < 0 || level > 9) {
            showInfo(
                'Invalid Level',
                'Spell level must be between 0 and 9.',
            );
            return;
        }

        const duplicate = spells.some(
            (spell) =>
                spell !== editingSpell &&
                spell.name.trim().toLowerCase() === name.toLowerCase(),
        );

        if (duplicate) {
            showInfo(
                'Spell Already Exists',
                `${name} is already in this spellbook.`,
            );
            return;
        }

        try {
            let updatedSpells: Spell[];

            if (editingSpell) {
                updatedSpells = spells.map((spell) => {
                    if (spell !== editingSpell) return spell;

                    return Object.assign(cloneSpell(spell), {
                        name,
                        sourceClass: form.sourceClass,
                        level,
                        school: form.school.trim(),
                        castingTime: form.castingTime.trim(),
                        range: form.range.trim(),
                        components: form.components.trim(),
                        duration: form.duration.trim(),
                        concentration: form.concentration,
                        ritual: form.ritual,
                        description: form.description.trim(),
                    });
                });
            } else {
                const spell = new Spell({
                    name,
                    sourceClass: form.sourceClass,
                    level,
                    school: form.school.trim(),
                    castingTime: form.castingTime.trim(),
                    range: form.range.trim(),
                    components: form.components.trim(),
                    duration: form.duration.trim(),
                    concentration: form.concentration,
                    ritual: form.ritual,
                    description: form.description.trim(),
                    prepared: false,
                });

                updatedSpells = [...spells, spell];
            }

            const updatedSpellbook = Object.assign(
                Object.create(Object.getPrototypeOf(character.spellbook)),
                character.spellbook,
                { spells: updatedSpells },
            );

            const updated = cloneCharacter(character, {
                spellbook: updatedSpellbook,
            });

            if (await persist(updated)) {
                setForm(EMPTY_FORM);
                setEditingSpell(null);
                setAddVisible(false);
            }
        } catch (error) {
            showInfo(
                editingSpell ? 'Cannot Edit Spell' : 'Cannot Add Spell',
                error instanceof Error
                    ? error.message
                    : 'The spell could not be saved.',
            );
        }
    };

    const openPrepare = () => {
        setPreparedDraft(
            Object.fromEntries(
                spells.map((spell, index) => [
                    `${index}:${spell.name}`,
                    spell.prepared,
                ]),
            ),
        );
        setPrepareVisible(true);
    };

    const savePreparedSpells = async () => {
        if (saving) return;

        const updatedSpells = spells.map((spell, index) =>
            Object.assign(cloneSpell(spell), {
                prepared:
                    preparedDraft[`${index}:${spell.name}`] ??
                    spell.prepared,
            }),
        );

        const updatedSpellbook = Object.assign(
            Object.create(Object.getPrototypeOf(character.spellbook)),
            character.spellbook,
            { spells: updatedSpells },
        );

        const updated = cloneCharacter(character, {
            spellbook: updatedSpellbook,
        });

        if (await persist(updated)) {
            setPrepareVisible(false);
        }
    };

    const openCast = (spell: Spell) => {
        if (spell.level === 0) {
            showInfo(
                'Cast Cantrip',
                `${spell.name} does not consume a spell slot.`,
            );
            return;
        }

        setCastSpell(spell);
        setCastingLevel(null);
    };

    const useSpell = async () => {
        if (!castSpell || castingLevel === null || saving) return;

        const slot = character.spellSlots[castingLevel];

        if (
            !slot ||
            castingLevel < castSpell.level ||
            slot.maximum <= 0 ||
            slot.current <= 0
        ) {
            showInfo(
                'No Spell Slots',
                'That spell slot is no longer available.',
            );
            return;
        }

        try {
            const updatedSlot = Object.assign(
                Object.create(Object.getPrototypeOf(slot)),
                slot,
            );

            updatedSlot.use();

            const updatedSpellSlots = {
                ...character.spellSlots,
                [castingLevel]: updatedSlot,
            };

            const updated = cloneCharacter(character, {
                spellSlots: updatedSpellSlots,
                logs: [
                    ...character.logs,
                    `Cast spell: ${castSpell.name} (Level ${castingLevel})`,
                    `Used one Level ${castingLevel} spell slot. Remaining: ${updatedSlot.current}/${updatedSlot.maximum}.`,
                ],
            });

            if (await persist(updated)) {
                setCastSpell(null);
                setCastingLevel(null);
            }
        } catch (error) {
            showInfo(
                'Cannot Cast Spell',
                error instanceof Error
                    ? error.message
                    : 'The spell could not be cast.',
            );
        }
    };

    const removeSpell = (spell: Spell) => {
        showConfirm({
            title: 'Remove Spell',
            message: `Remove ${spell.name} from your spellbook?`,
            cancelLabel: 'Cancel',
            confirmLabel: 'Remove',
            destructive: true,
            onConfirm: async () => {
                const updatedSpellbook = Object.assign(
                    Object.create(
                        Object.getPrototypeOf(character.spellbook),
                    ),
                    character.spellbook,
                    {
                        spells: spells.filter((item) => item !== spell),
                    },
                );

                await persist(
                    cloneCharacter(character, {
                        spellbook: updatedSpellbook,
                    }),
                );
            },
        });
    };

    const inputStyle = {
        color: colors.text,
        backgroundColor: colors.background,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 9,
        fontSize: 14,
    } as const;

    const buttonStyle = {
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 8,
        backgroundColor: colors.backgroundSelected,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    };

    const buttonTextStyle = {
        color: colors.text,
        fontSize: 12,
        fontWeight: '700' as const,
    };

    const renderSpellCard = (spell: Spell) => (
        <View
            key={spell.name}
            style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: colors.backgroundElement,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 8,
            }}
        >
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 8,
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
                            color: colors.accent,
                            fontSize: 15,
                            fontWeight: '800',
                        }}
                    >
                        {spell.name}
                    </Text>

                    <Text
                        style={{
                            color: colors.textSecondary,
                            fontSize: 12,
                        }}
                    >
                        {spell.level === 0
                            ? 'Cantrip'
                            : `Level ${spell.level}`}
                        {' · '}
                        {spell.sourceClass || character.characterClass}
                        {' · '}
                        {spell.school || 'School unspecified'}
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Pressable
                        onPress={() => openEditSpell(spell)}
                        disabled={saving}
                        style={buttonStyle}
                        accessibilityLabel={`Edit ${spell.name}`}
                    >
                        <Ionicons
                            name="create-outline"
                            size={12}
                            color={colors.text}
                        />
                    </Pressable>

                    <Pressable
                        onPress={() => removeSpell(spell)}
                        disabled={saving}
                        style={buttonStyle}
                        accessibilityLabel={`Remove ${spell.name}`}
                    >
                        <Ionicons
                            name="trash-outline"
                            size={12}
                            color="#E05252"
                        />
                    </Pressable>
                </View>
            </View>

            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {spell.castingTime || 'Casting time unspecified'}
                {' · Range: '}
                {spell.range || 'Unspecified'}
            </Text>

            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Components: {spell.components || 'Unspecified'}
                {' · Duration: '}
                {spell.duration || 'Unspecified'}
            </Text>

            {(spell.concentration || spell.ritual) && (
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {[
                        spell.concentration && 'Concentration',
                        spell.ritual && 'Ritual',
                    ]
                        .filter(Boolean)
                        .join(' · ')}
                </Text>
            )}

            <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19 }}>
                {spell.description || 'No description provided.'}
            </Text>

            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                }}
            >
                <Text
                    style={{
                        color: colors.textSecondary,
                        fontSize: 12,
                    }}
                >
                    {spell.prepared ? 'Prepared' : 'Not prepared'}
                </Text>

                <Pressable
                    onPress={() => openCast(spell)}
                    style={[
                        buttonStyle,
                        { backgroundColor: colors.accent },
                    ]}
                >
                    <Text
                        style={[
                            buttonTextStyle,
                            {
                                color:
                                    scheme === 'dark' ? '#11100F' : '#FFFFFF',
                            },
                        ]}
                    >
                        {spell.level === 0 ? 'Use Cantrip' : 'Cast Spell'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );

    return (
        <>
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
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                        }}
                    >
                        <Text
                            style={{
                                color: colors.accent,
                                fontSize: 11,
                                fontWeight: '800',
                                letterSpacing: 2,
                            }}
                        >
                            SPELLBOOK
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Pressable
                                onPress={() => {
                                    if (saving) return;

                                    setEditingSpell(null);
                                    setForm({
                                        ...EMPTY_FORM,
                                        sourceClass: characterClasses[0] ?? '',
                                    });
                                    setAddVisible(true);
                                }}
                                disabled={saving}
                                style={buttonStyle}
                            >
                                <Text style={buttonTextStyle}>+ Add Spell</Text>
                            </Pressable>

                            <Pressable
                                onPress={openPrepare}
                                disabled={saving}
                                style={buttonStyle}
                            >
                                <Text style={buttonTextStyle}>
                                    Prepare Spells
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    {preparedSpells.length === 0 ? (
                        <Text
                            style={{
                                color: colors.textSecondary,
                                fontSize: 13,
                                lineHeight: 19,
                            }}
                        >
                            No prepared spells yet. Add spells to your
                            Spellbook, then prepare the ones you want to use.
                        </Text>
                    ) : (
                        <View style={{ gap: 16 }}>
                            {Array.from({ length: 10 }, (_, level) => {
                                const levelSpells = preparedSpells.filter(
                                    (spell) => spell.level === level,
                                );

                                if (levelSpells.length === 0) return null;

                                return (
                                    <View key={level} style={{ gap: 10 }}>
                                        <Text
                                            style={{
                                                color: colors.textSecondary,
                                                fontSize: 11,
                                                fontWeight: '800',
                                                letterSpacing: 1.5,
                                            }}
                                        >
                                            {level === 0
                                                ? 'CANTRIPS'
                                                : `LEVEL ${level}`}
                                        </Text>

                                        <View style={{ gap: 10 }}>
                                            {levelSpells.map(renderSpellCard)}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {spells.some((spell) => !spell.prepared) && (
                        <Text
                            style={{
                                color: colors.textSecondary,
                                fontSize: 12,
                            }}
                        >
                            {spells.filter((spell) => !spell.prepared).length}{' '}
                            unprepared spell(s) in your spellbook.
                        </Text>
                    )}
                </View>
            </BlurView>

            <Modal
                visible={addVisible}
                transparent
                animationType="fade"
                onRequestClose={closeSpellForm}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        justifyContent: 'center',
                        padding: 18,
                        alignItems: 'center',
                    }}
                >
                    <View
                        style={{
                            maxHeight: '90%',
                            backgroundColor: colors.background,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: colors.border,
                            padding: 18,
                            gap: 12,
                            maxWidth: 600,
                            minWidth: 300,

                        }}
                    >
                        <Text
                            style={{
                                color: colors.text,
                                fontSize: 18,
                                fontWeight: '800',
                            }}
                        >
                            {editingSpell ? 'Edit Spell' : 'Add Spell'}
                        </Text>

                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ gap: 10 }}
                        >
                            <Field label="Spell Name" colors={colors}>
                                <TextInput
                                    value={form.name}
                                    onChangeText={(v) => updateForm('name', v)}
                                    placeholder="Spell name"
                                    placeholderTextColor={colors.textSecondary}
                                    style={inputStyle}
                                />
                            </Field>

                            <Field label="Spell Level (0–9)" colors={colors}>
                                <TextInput
                                    value={form.level}
                                    onChangeText={(v) => updateForm('level', v)}
                                    keyboardType="number-pad"
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
                                    style={inputStyle}
                                />
                            </Field>

                            <Field label="Spellcasting Class" colors={colors}>
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        gap: 8,
                                    }}
                                >
                                    {characterClasses.map((className) => {
                                        const selected =
                                            form.sourceClass === className;

                                        return (
                                            <Pressable
                                                key={className}
                                                onPress={() =>
                                                    updateForm(
                                                        'sourceClass',
                                                        className,
                                                    )
                                                }
                                                style={[
                                                    buttonStyle,
                                                    {
                                                        backgroundColor:
                                                            selected
                                                                ? colors.accent
                                                                : colors.backgroundElement,
                                                        borderColor: selected
                                                            ? colors.accent
                                                            : colors.border,
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        buttonTextStyle,
                                                        {
                                                            color: selected
                                                                ? scheme === 'dark'
                                                                    ? '#11100F'
                                                                    : '#FFFFFF'
                                                                : colors.text,
                                                        },
                                                    ]}
                                                >
                                                    {className}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </Field>

                            {(
                                [
                                    ['school', 'School'],
                                    ['castingTime', 'Casting Time'],
                                    ['range', 'Range'],
                                    ['components', 'Components'],
                                    ['duration', 'Duration'],
                                ] as const
                            ).map(([key, label]) => (
                                <Field
                                    key={key}
                                    label={label}
                                    colors={colors}
                                >
                                    <TextInput
                                        value={form[key]}
                                        onChangeText={(v) => updateForm(key, v)}
                                        placeholder={
                                            key === 'castingTime'
                                                ? 'Action, Reaction, 1 minute'
                                                : key === 'components'
                                                    ? 'V, S, M'
                                                    : key === 'duration'
                                                        ? 'Instantaneous, 1 minute'
                                                        : label
                                        }
                                        placeholderTextColor={colors.textSecondary}
                                        style={inputStyle}
                                    />
                                </Field>
                            ))}

                            {(
                                [
                                    ['concentration', 'Concentration'],
                                    ['ritual', 'Ritual'],
                                ] as const
                            ).map(([key, label]) => (
                                <View
                                    key={key}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: colors.text,
                                            fontSize: 14,
                                        }}
                                    >
                                        {label}
                                    </Text>

                                    <Switch
                                        value={form[key]}
                                        onValueChange={(v) => updateForm(key, v)}
                                        trackColor={{
                                            false: colors.border,
                                            true: colors.accent,
                                        }}
                                    />
                                </View>
                            ))}

                            <Field label="Description" colors={colors}>
                                <TextInput
                                    value={form.description}
                                    onChangeText={(v) =>
                                        updateForm('description', v)
                                    }
                                    placeholder="Describe what the spell does..."
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                    textAlignVertical="top"
                                    style={[inputStyle, { minHeight: 100 }]}
                                />
                            </Field>
                        </ScrollView>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <ModalButton
                                label="Cancel"
                                colors={colors}
                                onPress={closeSpellForm}
                                disabled={saving}
                            />

                            <ModalButton
                                label={
                                    saving
                                        ? 'Saving…'
                                        : editingSpell
                                            ? 'Save Changes'
                                            : 'Save Spell'
                                }
                                colors={colors}
                                onPress={() => void submitSpell()}
                                disabled={saving}
                                primary
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={prepareVisible}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!saving) setPrepareVisible(false);
                }}
            >
                <View
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        padding: 18,
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        alignItems: 'center',
                    }}
                >
                    <View
                        style={{
                            maxHeight: '85%',
                            padding: 18,
                            gap: 14,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            maxWidth: 600,
                            minWidth: 300,

                        }}
                    >
                        <Text
                            style={{
                                color: colors.text,
                                fontSize: 18,
                                fontWeight: '800',
                            }}
                        >
                            Prepare Spells
                        </Text>

                        <Text
                            style={{
                                color: colors.textSecondary,
                                fontSize: 13,
                                lineHeight: 19,
                            }}
                        >
                            Select the spells you want to prepare. Unselected
                            spells remain in your Spellbook.
                        </Text>

                        <ScrollView contentContainerStyle={{ gap: 16 }}>
                            {Array.from({ length: 10 }, (_, level) => {
                                const levelSpells = spells
                                    .map((spell, index) => ({ spell, index }))
                                    .filter(
                                        ({ spell }) => spell.level === level,
                                    );

                                if (levelSpells.length === 0) return null;

                                return (
                                    <View key={level} style={{ gap: 8 }}>
                                        <Text
                                            style={{
                                                color: colors.textSecondary,
                                                fontSize: 11,
                                                fontWeight: '800',
                                                letterSpacing: 1.5,
                                            }}
                                        >
                                            {level === 0
                                                ? 'CANTRIPS'
                                                : `LEVEL ${level}`}
                                        </Text>

                                        {levelSpells.map(({ spell, index }) => {
                                            const key = `${index}:${spell.name}`;
                                            const checked =
                                                preparedDraft[key] ??
                                                spell.prepared;

                                            return (
                                                <Pressable
                                                    key={key}
                                                    disabled={saving}
                                                    onPress={() =>
                                                        setPreparedDraft(
                                                            (previous) => ({
                                                                ...previous,
                                                                [key]: !checked,
                                                            }),
                                                        )
                                                    }
                                                    style={{
                                                        padding: 10,
                                                        borderRadius: 10,
                                                        borderWidth: 1,
                                                        borderColor:
                                                            colors.border,
                                                        backgroundColor: checked
                                                            ? colors.backgroundSelected
                                                            : colors.backgroundElement,
                                                        gap: 4,
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: 10,
                                                        }}
                                                    >
                                                        <View
                                                            style={{
                                                                width: 20,
                                                                height: 20,
                                                                borderRadius: 5,
                                                                borderWidth: 1,
                                                                borderColor:
                                                                    colors.accent,
                                                                backgroundColor:
                                                                    checked
                                                                        ? colors.accent
                                                                        : 'transparent',
                                                                alignItems:
                                                                    'center',
                                                                justifyContent:
                                                                    'center',
                                                            }}
                                                        >
                                                            {checked && (
                                                                <Text
                                                                    style={{
                                                                        color:
                                                                            scheme ===
                                                                                'dark'
                                                                                ? '#11100F'
                                                                                : '#FFFFFF',
                                                                        fontWeight:
                                                                            '800',
                                                                    }}
                                                                >
                                                                    ✓
                                                                </Text>
                                                            )}
                                                        </View>

                                                        <Text
                                                            style={{
                                                                flex: 1,
                                                                color: colors.text,
                                                                fontSize: 14,
                                                                fontWeight: '600',
                                                            }}
                                                        >
                                                            {spell.name}
                                                        </Text>
                                                    </View>

                                                    <Text
                                                        style={{
                                                            color: colors.textSecondary,
                                                            fontSize: 12,
                                                            marginLeft: 30,
                                                        }}
                                                    >
                                                        {spell.castingTime ||
                                                            'Casting time unspecified'}
                                                        {' · Range: '}
                                                        {spell.range ||
                                                            'Unspecified'}
                                                        {' · Concentration: '}
                                                        {spell.concentration
                                                            ? 'Yes'
                                                            : 'No'}
                                                        {' · Ritual: '}
                                                        {spell.ritual
                                                            ? 'Yes'
                                                            : 'No'}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                );
                            })}
                        </ScrollView>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <ModalButton
                                label="Cancel"
                                colors={colors}
                                onPress={() => setPrepareVisible(false)}
                                disabled={saving}
                            />

                            <ModalButton
                                label={saving ? 'Saving…' : 'Save'}
                                colors={colors}
                                onPress={() => void savePreparedSpells()}
                                disabled={saving}
                                primary
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={castSpell !== null}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!saving) {
                        setCastSpell(null);
                        setCastingLevel(null);
                    }
                }}
            >
                <View
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        padding: 22,
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        alignItems: 'center',
                    }}
                >
                    <View
                        style={{
                            padding: 20,
                            gap: 16,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            maxWidth: 600,
                            minWidth: 300,
                        }}
                    >
                        <Text
                            style={{
                                color: colors.text,
                                fontSize: 18,
                                fontWeight: '800',
                            }}
                        >
                            Cast {castSpell?.name}
                        </Text>

                        <Text
                            style={{
                                color: colors.textSecondary,
                                fontSize: 13,
                            }}
                        >
                            Spell level: {castSpell?.level}
                        </Text>

                        {availableLevels.length === 0 ? (
                            <Text
                                style={{
                                    color: colors.textSecondary,
                                    fontSize: 13,
                                    lineHeight: 19,
                                }}
                            >
                                No available spell slots at level{' '}
                                {castSpell?.level} or higher.
                            </Text>
                        ) : (
                            <>
                                <Text
                                    style={{
                                        color: colors.text,
                                        fontSize: 14,
                                        fontWeight: '600',
                                    }}
                                >
                                    Cast at which level?
                                </Text>

                                <View
                                    style={{
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        gap: 8,
                                    }}
                                >
                                    {availableLevels.map((level) => {
                                        const slot =
                                            character.spellSlots[level];
                                        const selected =
                                            castingLevel === level;

                                        return (
                                            <Pressable
                                                key={level}
                                                disabled={saving}
                                                onPress={() =>
                                                    setCastingLevel(level)
                                                }
                                                style={{
                                                    minWidth: 92,
                                                    padding: 12,
                                                    borderRadius: 10,
                                                    borderWidth: 1,
                                                    borderColor: selected
                                                        ? colors.accent
                                                        : colors.border,
                                                    backgroundColor: selected
                                                        ? colors.backgroundSelected
                                                        : colors.backgroundElement,
                                                    gap: 4,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color: colors.text,
                                                        fontWeight: '700',
                                                    }}
                                                >
                                                    Level {level}
                                                </Text>

                                                <Text
                                                    style={{
                                                        color: colors.textSecondary,
                                                        fontSize: 12,
                                                    }}
                                                >
                                                    {slot.current}/
                                                    {slot.maximum} remaining
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <ModalButton
                                label="Cancel"
                                colors={colors}
                                onPress={() => {
                                    setCastSpell(null);
                                    setCastingLevel(null);
                                }}
                                disabled={saving}
                            />

                            {availableLevels.length > 0 && (
                                <ModalButton
                                    label={saving ? 'Casting…' : 'Use Spell'}
                                    colors={colors}
                                    onPress={() => void useSpell()}
                                    disabled={
                                        saving || castingLevel === null
                                    }
                                    primary
                                />
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </>
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
        <View style={{ gap: 5 }}>
            <Text
                style={{
                    color: colors.textSecondary,
                    fontSize: 12,
                    fontWeight: '600',
                }}
            >
                {label}
            </Text>
            {children}
        </View>
    );
}

function ModalButton({
    label,
    colors,
    onPress,
    disabled = false,
    primary = false,
}: {
    label: string;
    colors: (typeof Colors)['light'];
    onPress: () => void;
    disabled?: boolean;
    primary?: boolean;
}) {
    const scheme = useColorScheme();

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={{
                flex: 1,
                paddingVertical: 11,
                paddingHorizontal: 12,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 9,
                borderWidth: 1,
                borderColor: primary ? colors.accent : colors.border,
                backgroundColor: primary
                    ? colors.accent
                    : colors.backgroundSelected,
                opacity: disabled ? 0.5 : 1,
            }}
        >
            <Text
                style={{
                    color: primary
                        ? scheme === 'dark'
                            ? '#11100F'
                            : '#FFFFFF'
                        : colors.text,
                    fontSize: 12,
                    fontWeight: '700',
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

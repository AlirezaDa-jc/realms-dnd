
import { Colors } from '@/constants/theme';
import type { Character } from '@/models/character';
import { ClassAction } from '@/models/class-action';
import type { RecoveryType } from '@/models/resource';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    Text,
    TextInput,
    useColorScheme,
    View
} from 'react-native';

type ClassActionsProps = {
    character: Character;
    onUpdate: (character: Character) => Promise<void>;
};

type ActionForm = {
    name: string;
    description: string;
    resourceName: string | null;
    resourceCost: string;
    limitedUses: boolean;
    maximumUses: string;
    currentUses: string;
    recovery: RecoveryType;
};

const RECOVERY_OPTIONS: {
    value: RecoveryType;
    label: string;
}[] = [
        { value: 'short_rest', label: 'Short Rest' },
        { value: 'long_rest', label: 'Long Rest' },
        { value: 'manual', label: 'Manual' },
        { value: 'never', label: 'Never' },
    ];

const EMPTY_FORM: ActionForm = {
    name: '',
    description: '',
    resourceName: null,
    resourceCost: '1',
    limitedUses: false,
    maximumUses: '1',
    currentUses: '1',
    recovery: 'long_rest',
};

export default function ClassActions({
    character,
    onUpdate,
}: ClassActionsProps) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [modalVisible, setModalVisible] = useState(false);
    const [form, setForm] = useState<ActionForm>({ ...EMPTY_FORM });
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
        input: {
            color: colors.text,
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 9,
            fontSize: 14,
        } as const,
        button: {
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            color: scheme === 'dark' ? '#11100F' : '#FFFFFF',
            backgroundColor: colors.accent,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
        },
        buttonText: {
            fontSize: 12,
            fontWeight: '600' as const,
        },
    };

    function updateForm<K extends keyof ActionForm>(
        key: K,
        value: ActionForm[K],
    ) {
        setForm((previous) => ({ ...previous, [key]: value }));
    }

    function openAddModal() {
        setForm({ ...EMPTY_FORM });
        setModalVisible(true);
    }

    async function saveAction() {
        const name = form.name.trim();

        if (!name) {
            Alert.alert('Missing name', 'Enter an action name.');
            return;
        }

        const resourceCost = Number(form.resourceCost);
        const maximumUses = Number(form.maximumUses);
        const currentUses = Number(form.currentUses);

        if (
            form.resourceName !== null &&
            (!Number.isInteger(resourceCost) ||
                resourceCost < 1 ||
                resourceCost > 999)
        ) {
            Alert.alert(
                'Invalid resource cost',
                'Resource cost must be between 1 and 999.',
            );
            return;
        }

        if (form.limitedUses) {
            if (
                !Number.isInteger(maximumUses) ||
                maximumUses < 1 ||
                maximumUses > 999
            ) {
                Alert.alert(
                    'Invalid maximum uses',
                    'Maximum uses must be between 1 and 999.',
                );
                return;
            }

            if (
                !Number.isInteger(currentUses) ||
                currentUses < 0 ||
                currentUses > maximumUses
            ) {
                Alert.alert(
                    'Invalid current uses',
                    'Current uses must be between 0 and maximum uses.',
                );
                return;
            }
        }

        let action: ClassAction;

        try {
            action = new ClassAction({
                name,
                description: form.description.trim(),
                resourceName: form.resourceName,
                resourceCost:
                    form.resourceName !== null ? resourceCost : null,
                maximumUses: form.limitedUses ? maximumUses : null,
                currentUses: form.limitedUses ? currentUses : null,
                recovery: form.limitedUses ? form.recovery : null,
            });
        } catch (error) {
            Alert.alert(
                'Invalid action',
                error instanceof Error ? error.message : 'Could not create action.',
            );
            return;
        }

        const updatedCharacter = Object.assign(
            Object.create(Object.getPrototypeOf(character)),
            character,
            {
                classActions: [...character.classActions, action],
            },
        ) as Character;

        setSaving(true);

        try {
            await onUpdate(updatedCharacter);
            setModalVisible(false);
            setForm({ ...EMPTY_FORM });
        } catch (error) {
            Alert.alert(
                'Save failed',
                error instanceof Error ? error.message : 'Could not save the action.',
            );
        } finally {
            setSaving(false);
        }
    }

    function getActionUnavailableReason(action: ClassAction): string | null {
        if (
            action.maximumUses !== null &&
            action.currentUses !== null &&
            action.currentUses <= 0
        ) {
            switch (action.recovery) {
                case 'short_rest':
                    return 'No uses remaining · Recover on Short Rest';

                case 'long_rest':
                    return 'No uses remaining · Recover on Long Rest';

                case 'manual':
                    return 'No uses remaining · Requires manual recovery';

                case 'never':
                    return 'No uses remaining · Cannot recover automatically';

                default:
                    return 'No uses remaining';
            }
        }

        if (action.resourceName !== null && action.resourceCost !== null) {
            try {
                const resource = character.getResource(action.resourceName);

                if (resource.current < action.resourceCost) {
                    return `Not enough ${resource.name} (${resource.current}/${action.resourceCost})`;
                }
            } catch {
                return `Missing resource: ${action.resourceName}`;
            }
        }

        return null;
    }

    async function useAction(index: number) {
        const updatedCharacter = Object.assign(
            Object.create(Object.getPrototypeOf(character)),
            character,
            {
                classActions: character.classActions.map((item) =>
                    Object.assign(
                        Object.create(Object.getPrototypeOf(item)),
                        item,
                    ),
                ),
                resources: character.resources.map((resource) =>
                    Object.assign(
                        Object.create(Object.getPrototypeOf(resource)),
                        resource,
                    ),
                ),
                logs: [...character.logs],
            },
        ) as Character;

        const action = updatedCharacter.classActions[index];

        try {
            action.use(updatedCharacter);
            updatedCharacter.logs.push(`Used class action: ${action.name}`);
            await onUpdate(updatedCharacter);
        } catch (error) {
            Alert.alert(
                'Cannot use action',
                error instanceof Error ? error.message : 'Could not use this action.',
            );
        }
    }

    function removeAction(index: number) {
        const action = character.classActions[index];

        Alert.alert(
            'Remove action',
            `Remove "${action.name}" from this character?`,
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
                                classActions: character.classActions.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                ),
                            },
                        ) as Character;

                        try {
                            await onUpdate(updatedCharacter);
                        } catch (error) {
                            Alert.alert(
                                'Remove failed',
                                error instanceof Error
                                    ? error.message
                                    : 'Could not remove the action.',
                            );
                        }
                    },
                },
            ],
        );
    }

    function renderChoice(
        label: string,
        selected: boolean,
        onPress: () => void,
    ) {
        return (
            <Pressable
                key={label}
                onPress={onPress}
                style={{
                    backgroundColor: selected
                        ? colors.accent
                        : 'transparent',
                    borderColor: selected ? colors.border : colors.accent,
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                }}
            >
                <Text
                    style={{
                        ...styles.buttonText,
                        color: selected ? colors.background : colors.accent
                    }}
                >{label}</Text>
            </Pressable>
        );
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
                marginTop: 16
            }}
        >
            <View style={{ gap: 12 }}>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                    }}
                >
                    <Text style={styles.title}>CLASS ACTIONS</Text>

                    <Pressable onPress={openAddModal} style={styles.button}>
                        <Text style={styles.buttonText}>+ Add Action</Text>
                    </Pressable>
                </View>

                {character.classActions.length === 0 ? (
                    <View
                        style={{
                            ...styles.card,
                            alignItems: 'center',
                            paddingVertical: 24,
                        }}
                    >
                        <Text style={styles.secondary}>
                            No class actions added yet.
                        </Text>
                    </View>
                ) : (
                    character.classActions.map((action, index) => {
                        const details: string[] = [];
                        const unavailableReason = getActionUnavailableReason(action);
                        if (
                            action.resourceName !== null &&
                            action.resourceCost !== null
                        ) {
                            details.push(
                                `${action.resourceCost} ${action.resourceName}`,
                            );
                        }

                        if (
                            action.maximumUses !== null &&
                            action.currentUses !== null
                        ) {
                            const recoveryLabel =
                                RECOVERY_OPTIONS.find(
                                    (option) => option.value === action.recovery,
                                )?.label ?? action.recovery;

                            details.push(
                                `Uses: ${action.currentUses}/${action.maximumUses} · ${recoveryLabel}`,
                            );
                        }

                        if (details.length === 0) {
                            details.push('Unlimited uses');
                        }

                        return (
                            <View key={`${action.name}-${index}`} style={styles.card}>
                                <Text
                                    style={{
                                        color: colors.text,
                                        fontSize: 16,
                                        fontWeight: '700',
                                    }}
                                >
                                    {action.name}
                                </Text>

                                <Text style={styles.secondary}>
                                    {details.join(' · ')}
                                </Text>

                                <Text style={styles.text}>
                                    {action.description || 'No description provided.'}
                                </Text>
                                {unavailableReason !== null && (
                                    <Text
                                        style={{
                                            color: colors.textSecondary,
                                            fontSize: 12,
                                        }}
                                    >
                                        Unavailable: {unavailableReason}
                                    </Text>
                                )}

                                <View
                                    style={{
                                        flexDirection: 'row',
                                        gap: 8,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <Pressable
                                        disabled={unavailableReason !== null}
                                        onPress={() => void useAction(index)}
                                        style={[
                                            styles.button,
                                            {
                                                opacity: unavailableReason !== null ? 0.4 : 1,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.buttonText,
                                                {
                                                    color:
                                                        scheme === 'dark' ? '#11100F' : '#FFFFFF',
                                                },
                                            ]}
                                        >
                                            {unavailableReason !== null ? 'Unavailable' : 'Use'}
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => removeAction(index)}
                                        style={{
                                            ...styles.button,
                                            backgroundColor: colors.background,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                        }}
                                    >
                                        <Text style={{
                                            ...styles.buttonText,
                                            color: colors.text
                                        }}>Remove</Text>
                                    </Pressable>
                                </View>
                            </View>
                        );
                    })
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
                            <Text style={styles.title}>Add Class Action</Text>

                            <View style={{ gap: 6 }}>
                                <Text style={styles.text}>Name *</Text>
                                <TextInput
                                    value={form.name}
                                    onChangeText={(value) =>
                                        updateForm('name', value)
                                    }
                                    placeholder="Action name"
                                    placeholderTextColor={colors.textSecondary}
                                    style={styles.input}
                                    maxLength={100}
                                />
                            </View>

                            <View style={{ gap: 6 }}>
                                <Text style={styles.text}>Description</Text>
                                <TextInput
                                    value={form.description}
                                    onChangeText={(value) =>
                                        updateForm('description', value)
                                    }
                                    placeholder="Describe the action"
                                    placeholderTextColor={colors.textSecondary}
                                    style={[
                                        styles.input,
                                        {
                                            minHeight: 90,
                                            textAlignVertical: 'top',
                                        },
                                    ]}
                                    multiline
                                />
                            </View>

                            <View style={{ gap: 8, }}>
                                <Text style={styles.text}>Resource cost</Text>

                                <View
                                    style={{
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        gap: 8,
                                    }}
                                >
                                    {renderChoice(
                                        'No resource',
                                        form.resourceName === null,
                                        () => updateForm('resourceName', null),
                                    )}

                                    {character.resources.map((resource) =>
                                        renderChoice(
                                            resource.name,
                                            form.resourceName === resource.name,
                                            () => {
                                                updateForm(
                                                    'resourceName',
                                                    resource.name,
                                                );
                                            },
                                        ),
                                    )}
                                </View>

                                {form.resourceName !== null && (
                                    <TextInput
                                        value={form.resourceCost}
                                        onChangeText={(value) =>
                                            updateForm('resourceCost', value)
                                        }
                                        keyboardType="number-pad"
                                        placeholder="Resource cost"
                                        placeholderTextColor={colors.textSecondary}
                                        style={styles.input}
                                    />
                                )}
                            </View>

                            <View style={{ gap: 8 }}>
                                <Pressable
                                    onPress={() =>
                                        setForm((previous) => ({
                                            ...previous,
                                            limitedUses: !previous.limitedUses,
                                        }))
                                    }
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 10,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 22,
                                            height: 22,
                                            borderRadius: 5,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            backgroundColor: form.limitedUses
                                                ? colors.accent
                                                : colors.background,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {form.limitedUses && (
                                            <Text
                                                style={{
                                                    color: '#FFFFFF',
                                                    fontWeight: '700',
                                                }}
                                            >
                                                ✓
                                            </Text>
                                        )}
                                    </View>

                                    <Text style={styles.text}>Limited uses</Text>
                                </Pressable>

                                {form.limitedUses && (
                                    <>
                                        <Text style={styles.text}>
                                            Maximum uses
                                        </Text>
                                        <TextInput
                                            value={form.maximumUses}
                                            onChangeText={(value) => {
                                                setForm((previous) => {
                                                    const maximum = Number(value);
                                                    const current = Number(
                                                        previous.currentUses,
                                                    );

                                                    return {
                                                        ...previous,
                                                        maximumUses: value,
                                                        currentUses:
                                                            Number.isFinite(maximum) &&
                                                                maximum >= 1 &&
                                                                current > maximum
                                                                ? value
                                                                : previous.currentUses,
                                                    };
                                                });
                                            }}
                                            keyboardType="number-pad"
                                            style={styles.input}
                                        />

                                        <Text style={styles.text}>
                                            Current uses
                                        </Text>
                                        <TextInput
                                            value={form.currentUses}
                                            onChangeText={(value) =>
                                                updateForm('currentUses', value)
                                            }
                                            keyboardType="number-pad"
                                            style={styles.input}
                                        />

                                        <Text style={styles.text}>Recovery</Text>
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                flexWrap: 'wrap',
                                                gap: 8,
                                            }}
                                        >
                                            {RECOVERY_OPTIONS.map((option) =>
                                                renderChoice(
                                                    option.label,
                                                    form.recovery === option.value,
                                                    () =>
                                                        updateForm(
                                                            'recovery',
                                                            option.value,
                                                        ),
                                                ),
                                            )}
                                        </View>
                                    </>
                                )}
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
                                    style={{
                                        ...styles.button,
                                        backgroundColor: colors.background,
                                        borderRadius: 5,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                    }}
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
                                    onPress={saveAction}
                                    disabled={saving}
                                    style={styles.button}
                                >
                                    <Text style={styles.buttonText}>
                                        {saving ? 'Saving...' : 'Save Action'}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </BlurView>
    );
}

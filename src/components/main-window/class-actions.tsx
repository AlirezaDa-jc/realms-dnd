import { useDialog } from '@/components/dialog/realms-dialog';
import { Colors } from '@/constants/theme';
import type { Character } from '@/models/character';
import { ClassAction } from '@/models/class-action';
import type { RecoveryType } from '@/models/resource';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    useColorScheme,
    View,
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
    dynamicResourceCost: boolean;
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
    dynamicResourceCost: false,
};

export default function ClassActions({
    character,
    onUpdate,
}: ClassActionsProps) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const { showInfo, showConfirm } = useDialog();

    const [modalVisible, setModalVisible] = useState(false);
    const [form, setForm] = useState<ActionForm>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    // Index of the action currently being edited; null means adding a new action.
    const [editingActionIndex, setEditingActionIndex] = useState<number | null>(
        null,
    );

    const [useModalVisible, setUseModalVisible] = useState(false);
    const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(
        null,
    );
    const [useAmount, setUseAmount] = useState('1');

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

    function closeActionModal() {
        if (saving) return;

        setModalVisible(false);
        setEditingActionIndex(null);
        setForm({ ...EMPTY_FORM });
    }

    function openAddModal() {
        setEditingActionIndex(null);
        setForm({ ...EMPTY_FORM });
        setModalVisible(true);
    }

    function openEditModal(action: ClassAction, index: number) {
        if (saving) return;

        setEditingActionIndex(index);

        setForm({
            name: action.name,
            description: action.description,
            resourceName: action.resourceName,
            resourceCost:
                action.resourceCost !== null
                    ? String(action.resourceCost)
                    : '1',
            limitedUses:
                action.maximumUses !== null &&
                action.currentUses !== null,
            maximumUses:
                action.maximumUses !== null
                    ? String(action.maximumUses)
                    : '1',
            currentUses:
                action.currentUses !== null
                    ? String(action.currentUses)
                    : '1',
            recovery: action.recovery ?? 'long_rest',
            dynamicResourceCost: action.dynamicResourceCost,
        });

        setModalVisible(true);
    }

    async function saveAction() {
        if (saving) return;

        const name = form.name.trim();

        if (!name) {
            showInfo('Missing name', 'Enter an action name.');
            return;
        }

        const resourceCost = Number(form.resourceCost);
        const maximumUses = Number(form.maximumUses);
        const currentUses = Number(form.currentUses);

        if (
            form.resourceName !== null &&
            !form.dynamicResourceCost &&
            (!Number.isInteger(resourceCost) ||
                resourceCost < 1 ||
                resourceCost > 999)
        ) {
            showInfo(
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
                showInfo(
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
                showInfo(
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
                    form.resourceName !== null
                        ? form.dynamicResourceCost
                            ? null
                            : resourceCost
                        : null,
                maximumUses: form.limitedUses ? maximumUses : null,
                currentUses: form.limitedUses ? currentUses : null,
                recovery: form.limitedUses ? form.recovery : null,
                dynamicResourceCost:
                    form.resourceName !== null && form.dynamicResourceCost,
            });
        } catch (error) {
            showInfo(
                'Invalid action',
                error instanceof Error
                    ? error.message
                    : 'Could not create action.',
            );
            return;
        }

        const updatedActions = [...character.classActions];

        if (editingActionIndex !== null) {
            // Replace the existing action rather than adding a duplicate.
            if (!updatedActions[editingActionIndex]) {
                showInfo(
                    'Action not found',
                    'This action no longer exists. Please try again.',
                );
                return;
            }

            updatedActions[editingActionIndex] = action;
        } else {
            // Add a new action.
            updatedActions.push(action);
        }

        const updatedCharacter = Object.assign(
            Object.create(Object.getPrototypeOf(character)),
            character,
            {
                classActions: updatedActions,
            },
        ) as Character;

        setSaving(true);

        try {
            await onUpdate(updatedCharacter);
            setModalVisible(false);
            setEditingActionIndex(null);
            setForm({ ...EMPTY_FORM });
        } catch (error) {
            showInfo(
                'Save failed',
                error instanceof Error
                    ? error.message
                    : 'Could not save the action.',
            );
        } finally {
            setSaving(false);
        }
    }

    function getActionUnavailableReason(
        action: ClassAction,
    ): string | null {
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

        if (
            action.resourceName !== null &&
            action.resourceCost !== null &&
            !action.dynamicResourceCost
        ) {
            try {
                const resource = character.getResource(action.resourceName);

                if (resource.current < action.resourceCost) {
                    return `Not enough ${resource.name} (${resource.current}/${action.resourceCost})`;
                }
            } catch {
                return `Missing resource: ${action.resourceName}`;
            }
        }

        if (action.dynamicResourceCost && action.resourceName !== null) {
            try {
                const resource = character.getResource(action.resourceName);

                if (resource.current < 1) {
                    return `No ${resource.name} remaining`;
                }
            } catch {
                return `Missing resource: ${action.resourceName}`;
            }
        }

        return null;
    }

    async function useAction(index: number) {
        if (saving) return;

        const action = character.classActions[index];

        if (!action) return;

        if (
            action.dynamicResourceCost &&
            action.resourceName !== null
        ) {
            setSelectedActionIndex(index);
            setUseAmount('1');
            setUseModalVisible(true);
            return;
        }

        await executeAction(index, null);
    }

    async function executeAction(
        index: number,
        dynamicCost: number | null,
    ) {
        if (saving) return;

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

        if (!action) return;

        const originalCost = action.resourceCost;

        if (dynamicCost !== null) {
            action.resourceCost = dynamicCost;
        }

        setSaving(true);

        try {
            action.use(updatedCharacter);

            // The selected cost applies only to this use.
            action.resourceCost = originalCost;

            updatedCharacter.logs.push(`Used class action: ${action.name}`);

            await onUpdate(updatedCharacter);

            setUseModalVisible(false);
            setSelectedActionIndex(null);
        } catch (error) {
            showInfo(
                'Cannot use action',
                error instanceof Error
                    ? error.message
                    : 'Could not use this action.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function confirmDynamicUse() {
        if (selectedActionIndex === null || saving) return;

        const action = character.classActions[selectedActionIndex];

        if (!action || action.resourceName === null) return;

        const amount = Number(useAmount);

        if (
            !Number.isInteger(amount) ||
            amount < 1 ||
            amount > 999
        ) {
            showInfo(
                'Invalid amount',
                'Enter an amount between 1 and 999.',
            );
            return;
        }

        try {
            const resource = character.getResource(action.resourceName);

            if (amount > resource.current) {
                showInfo(
                    'Not enough resources',
                    `You have ${resource.current} ${resource.name}, but selected ${amount}.`,
                );
                return;
            }
        } catch {
            showInfo(
                'Missing resource',
                `Resource "${action.resourceName}" was not found.`,
            );
            return;
        }

        await executeAction(selectedActionIndex, amount);
    }

    function removeAction(index: number) {
        if (saving) return;

        const action = character.classActions[index];

        if (!action) return;

        showConfirm({
            title: 'Remove action',
            message: `Remove "${action.name}" from this character?`,
            confirmLabel: 'Remove',
            cancelLabel: 'Cancel',
            destructive: true,
            onConfirm: async () => {
                const updatedCharacter = Object.assign(
                    Object.create(Object.getPrototypeOf(character)),
                    character,
                    {
                        classActions: character.classActions.filter(
                            (_, itemIndex) => itemIndex !== index,
                        ),
                    },
                ) as Character;

                setSaving(true);

                try {
                    await onUpdate(updatedCharacter);
                } catch (error) {
                    showInfo(
                        'Remove failed',
                        error instanceof Error
                            ? error.message
                            : 'Could not remove the action.',
                    );
                } finally {
                    setSaving(false);
                }
            },
        });
    }

    function renderChoice(
        label: string,
        selected: boolean,
        onPress: () => void,
    ) {
        return (
            <Pressable
                key={label}
                disabled={saving}
                onPress={onPress}
                style={{
                    backgroundColor: selected
                        ? colors.accent
                        : 'transparent',
                    borderColor: selected
                        ? colors.border
                        : colors.accent,
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    opacity: saving ? 0.5 : 1,
                }}
            >
                <Text
                    style={{
                        ...styles.buttonText,
                        color: selected
                            ? scheme === 'dark'
                                ? '#11100F'
                                : '#FFFFFF'
                            : colors.accent,
                    }}
                >
                    {label}
                </Text>
            </Pressable>
        );
    }

    const selectedAction =
        selectedActionIndex !== null
            ? character.classActions[selectedActionIndex] ?? null
            : null;

    let selectedResourceCurrent: number | null = null;

    if (selectedAction?.resourceName) {
        try {
            selectedResourceCurrent = character.getResource(
                selectedAction.resourceName,
            ).current;
        } catch {
            selectedResourceCurrent = null;
        }
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
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                    }}
                >
                    <Text style={styles.title}>CLASS ACTIONS</Text>

                    <Pressable
                        onPress={openAddModal}
                        disabled={saving}
                        style={[
                            styles.button,
                            { opacity: saving ? 0.5 : 1 },
                        ]}
                    >
                        <Text
                            style={{
                                ...styles.buttonText,
                                color: scheme === 'dark' ? '#11100F' : '#FFFFFF',
                            }}
                        >
                            + Add Action
                        </Text>
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
                        const unavailableReason =
                            getActionUnavailableReason(action);

                        if (
                            action.resourceName !== null &&
                            action.dynamicResourceCost
                        ) {
                            details.push(
                                `Variable cost · ${action.resourceName}`,
                            );
                        } else if (
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
                            <View
                                key={`${action.name}-${index}`}
                                style={styles.card}
                            >
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
                                    {action.description ||
                                        'No description provided.'}
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
                                        justifyContent: 'flex-end',
                                    }}
                                >
                                    <Pressable
                                        disabled={
                                            saving ||
                                            unavailableReason !== null
                                        }
                                        onPress={() => void useAction(index)}
                                        style={[
                                            styles.button,
                                            {
                                                opacity:
                                                    saving ||
                                                        unavailableReason !== null
                                                        ? 0.4
                                                        : 1,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                ...styles.buttonText,
                                                color:
                                                    scheme === 'dark'
                                                        ? '#11100F'
                                                        : '#FFFFFF',
                                            }}
                                        >
                                            {unavailableReason !== null
                                                ? 'Unavailable'
                                                : 'Use'}
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        disabled={saving}
                                        onPress={() =>
                                            openEditModal(action, index)
                                        }
                                        style={[
                                            styles.button,
                                            {
                                                backgroundColor:
                                                    colors.background,
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                opacity: saving ? 0.5 : 1,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                ...styles.buttonText,
                                                color: colors.text,
                                            }}
                                        >
                                            Edit
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        disabled={saving}
                                        onPress={() => removeAction(index)}
                                        style={{
                                            ...styles.button,
                                            backgroundColor: colors.background,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            opacity: saving ? 0.5 : 1,
                                        }}
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
                            </View>
                        );
                    })
                )}

                {/* Add / Edit Class Action Modal */}
                <Modal
                    visible={modalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={closeActionModal}
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
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{
                                flexGrow: 1,
                                justifyContent: 'center',
                                paddingVertical: 20,
                                width: '100%',
                                maxWidth: 600,
                                alignSelf: 'center',
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
                                    {editingActionIndex !== null
                                        ? 'Edit Class Action'
                                        : 'Add Class Action'}
                                </Text>

                                <View style={{ gap: 6 }}>
                                    <Text style={styles.text}>Name *</Text>
                                    <TextInput
                                        value={form.name}
                                        onChangeText={(value) =>
                                            updateForm('name', value)
                                        }
                                        placeholder="Action name"
                                        placeholderTextColor={
                                            colors.textSecondary
                                        }
                                        style={styles.input}
                                        maxLength={100}
                                        editable={!saving}
                                    />
                                </View>

                                <View style={{ gap: 6 }}>
                                    <Text style={styles.text}>
                                        Description
                                    </Text>
                                    <TextInput
                                        value={form.description}
                                        onChangeText={(value) =>
                                            updateForm('description', value)
                                        }
                                        placeholder="Describe the action"
                                        placeholderTextColor={
                                            colors.textSecondary
                                        }
                                        style={[
                                            styles.input,
                                            {
                                                minHeight: 90,
                                                textAlignVertical: 'top',
                                            },
                                        ]}
                                        multiline
                                        editable={!saving}
                                    />
                                </View>

                                <View style={{ gap: 8 }}>
                                    <Text style={styles.text}>
                                        Resource cost
                                    </Text>

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
                                            () => {
                                                updateForm('resourceName', null);
                                                updateForm(
                                                    'dynamicResourceCost',
                                                    false,
                                                );
                                            },
                                        )}

                                        {character.resources.map((resource) =>
                                            renderChoice(
                                                resource.name,
                                                form.resourceName ===
                                                resource.name,
                                                () =>
                                                    updateForm(
                                                        'resourceName',
                                                        resource.name,
                                                    ),
                                            ),
                                        )}
                                    </View>

                                    {form.resourceName !== null && (
                                        <Pressable
                                            disabled={saving}
                                            onPress={() =>
                                                setForm((previous) => ({
                                                    ...previous,
                                                    dynamicResourceCost:
                                                        !previous.dynamicResourceCost,
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
                                                    backgroundColor:
                                                        form.dynamicResourceCost
                                                            ? colors.accent
                                                            : colors.background,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                {form.dynamicResourceCost && (
                                                    <Text
                                                        style={{
                                                            color:
                                                                scheme === 'dark'
                                                                    ? '#11100F'
                                                                    : '#FFFFFF',
                                                            fontWeight: '700',
                                                        }}
                                                    >
                                                        ✓
                                                    </Text>
                                                )}
                                            </View>

                                            <View
                                                style={{ flex: 1, gap: 2 }}
                                            >
                                                <Text style={styles.text}>
                                                    Ask amount when used
                                                </Text>
                                                <Text
                                                    style={styles.secondary}
                                                >
                                                    Choose how much resource to
                                                    spend each time.
                                                </Text>
                                            </View>
                                        </Pressable>
                                    )}

                                    {form.resourceName !== null &&
                                        !form.dynamicResourceCost && (
                                            <TextInput
                                                value={form.resourceCost}
                                                onChangeText={(value) =>
                                                    updateForm(
                                                        'resourceCost',
                                                        value.replace(
                                                            /[^0-9]/g,
                                                            '',
                                                        ),
                                                    )
                                                }
                                                keyboardType="number-pad"
                                                placeholder="Resource cost"
                                                placeholderTextColor={
                                                    colors.textSecondary
                                                }
                                                style={styles.input}
                                                editable={!saving}
                                            />
                                        )}
                                </View>

                                <View style={{ gap: 8 }}>
                                    <Pressable
                                        disabled={saving}
                                        onPress={() =>
                                            setForm((previous) => ({
                                                ...previous,
                                                limitedUses:
                                                    !previous.limitedUses,
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
                                                backgroundColor:
                                                    form.limitedUses
                                                        ? colors.accent
                                                        : colors.background,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            {form.limitedUses && (
                                                <Text
                                                    style={{
                                                        color:
                                                            scheme === 'dark'
                                                                ? '#11100F'
                                                                : '#FFFFFF',
                                                        fontWeight: '700',
                                                    }}
                                                >
                                                    ✓
                                                </Text>
                                            )}
                                        </View>

                                        <Text style={styles.text}>
                                            Limited uses
                                        </Text>
                                    </Pressable>

                                    {form.limitedUses && (
                                        <>
                                            <Text style={styles.text}>
                                                Maximum uses
                                            </Text>
                                            <TextInput
                                                value={form.maximumUses}
                                                onChangeText={(value) =>
                                                    updateForm(
                                                        'maximumUses',
                                                        value.replace(
                                                            /[^0-9]/g,
                                                            '',
                                                        ),
                                                    )
                                                }
                                                keyboardType="number-pad"
                                                placeholder="Maximum uses"
                                                placeholderTextColor={
                                                    colors.textSecondary
                                                }
                                                style={styles.input}
                                                editable={!saving}
                                            />

                                            <Text style={styles.text}>
                                                Current uses
                                            </Text>
                                            <TextInput
                                                value={form.currentUses}
                                                onChangeText={(value) =>
                                                    updateForm(
                                                        'currentUses',
                                                        value.replace(
                                                            /[^0-9]/g,
                                                            '',
                                                        ),
                                                    )
                                                }
                                                keyboardType="number-pad"
                                                placeholder="Current uses"
                                                placeholderTextColor={
                                                    colors.textSecondary
                                                }
                                                style={styles.input}
                                                editable={!saving}
                                            />

                                            <Text style={styles.text}>
                                                Recovery
                                            </Text>
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    flexWrap: 'wrap',
                                                    gap: 8,
                                                }}
                                            >
                                                {RECOVERY_OPTIONS.map(
                                                    (option) =>
                                                        renderChoice(
                                                            option.label,
                                                            form.recovery ===
                                                            option.value,
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
                                        onPress={closeActionModal}
                                        disabled={saving}
                                        style={{
                                            ...styles.button,
                                            backgroundColor:
                                                colors.background,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            opacity: saving ? 0.5 : 1,
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
                                        onPress={() => void saveAction()}
                                        disabled={saving}
                                        style={[
                                            styles.button,
                                            {
                                                opacity: saving ? 0.5 : 1,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                ...styles.buttonText,
                                                color:
                                                    scheme === 'dark'
                                                        ? '#11100F'
                                                        : '#FFFFFF',
                                            }}
                                        >
                                            {saving
                                                ? 'Saving...'
                                                : editingActionIndex !== null
                                                    ? 'Save Changes'
                                                    : 'Save Action'}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </Modal>

                {/* Dynamic Resource Use Modal */}
                <Modal
                    visible={useModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => {
                        if (!saving) {
                            setUseModalVisible(false);
                            setSelectedActionIndex(null);
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
                        <View
                            style={{
                                width: '100%',
                                maxWidth: 420,
                                padding: 20,
                                borderRadius: 16,
                                gap: 16,
                                backgroundColor: colors.background,
                                borderWidth: 1,
                                borderColor: colors.border,
                            }}
                        >
                            <Text style={styles.title}>
                                Use Class Action
                            </Text>

                            <Text style={styles.text}>
                                {selectedAction?.name ?? ''}
                            </Text>

                            <Text style={styles.secondary}>
                                Available:{' '}
                                {selectedResourceCurrent !== null &&
                                    selectedAction?.resourceName
                                    ? `${selectedResourceCurrent} ${selectedAction.resourceName}`
                                    : 'Resource unavailable'}
                            </Text>

                            <Text style={styles.text}>
                                Amount to spend
                            </Text>

                            <TextInput
                                value={useAmount}
                                onChangeText={(value) =>
                                    setUseAmount(
                                        value.replace(/[^0-9]/g, ''),
                                    )
                                }
                                keyboardType="number-pad"
                                placeholder="Enter amount"
                                placeholderTextColor={colors.textSecondary}
                                style={styles.input}
                                editable={!saving}
                                autoFocus
                            />

                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'flex-end',
                                    gap: 8,
                                }}
                            >
                                <Pressable
                                    disabled={saving}
                                    onPress={() => {
                                        setUseModalVisible(false);
                                        setSelectedActionIndex(null);
                                    }}
                                    style={{
                                        ...styles.button,
                                        backgroundColor: colors.background,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        opacity: saving ? 0.5 : 1,
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
                                    disabled={saving}
                                    onPress={() =>
                                        void confirmDynamicUse()
                                    }
                                    style={[
                                        styles.button,
                                        {
                                            opacity: saving ? 0.5 : 1,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={{
                                            ...styles.buttonText,
                                            color:
                                                scheme === 'dark'
                                                    ? '#11100F'
                                                    : '#FFFFFF',
                                        }}
                                    >
                                        {saving ? 'Using...' : 'Confirm'}
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
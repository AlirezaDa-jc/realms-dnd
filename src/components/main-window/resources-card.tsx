import { Colors } from '@/constants/theme';
import { useDialog } from '@/components/dialog/realms-dialog';
import type { Character } from '@/models/character';
import { CharacterResource, type RecoveryType } from '@/models/resource';
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

type ResourcesCardProps = {
    character: Character;
    onUpdate: (character: Character) => Promise<void>;
};

type ResourceForm = {
    name: string;
    maximum: string;
    current: string;
    recovery: RecoveryType;
};

type RecoveryOption = {
    value: RecoveryType;
    label: string;
};

const RECOVERY_OPTIONS: RecoveryOption[] = [
    { value: 'short_rest', label: 'Short Rest' },
    { value: 'long_rest', label: 'Long Rest' },
    { value: 'manual', label: 'Manual Recovery' },
    { value: 'never', label: 'No Automatic Recovery' },
];

const EMPTY_FORM: ResourceForm = {
    name: '',
    maximum: '1',
    current: '1',
    recovery: 'short_rest',
};

type ModalMode = 'add' | 'edit' | 'recover' | null;

export default function ResourcesCard({
    character,
    onUpdate,
}: ResourcesCardProps) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const { showInfo, showConfirm } = useDialog();

    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [form, setForm] = useState<ResourceForm>({ ...EMPTY_FORM });
    const [selectedName, setSelectedName] = useState<string | null>(null);
    const [recoverAmount, setRecoverAmount] = useState('1');
    const [recoverReason, setRecoverReason] = useState('');
    const [saving, setSaving] = useState(false);

    const resources = character.resources;

    const recoveryLabel = (recovery: RecoveryType) =>
        RECOVERY_OPTIONS.find((option) => option.value === recovery)?.label ??
        recovery;

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
            paddingVertical: 9,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.backgroundSelected,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
        },
        buttonText: {
            color: colors.text,
            fontSize: 12,
            fontWeight: '700' as const,
        },
        label: {
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: '600' as const,
        },
    };

    const selectedResource =
        resources.find((resource) => resource.name === selectedName) ?? null;

    const cloneCharacter = (): Character =>
        Object.assign(
            Object.create(Object.getPrototypeOf(character)),
            character,
            {
                resources: character.resources.map(
                    (resource) =>
                        new CharacterResource(
                            resource.name,
                            resource.maximum,
                            resource.current,
                            resource.recovery,
                        ),
                ),
                classActions: character.classActions.map((action) =>
                    Object.assign(
                        Object.create(Object.getPrototypeOf(action)),
                        action,
                    ),
                ),
                logs: [...character.logs],
            },
        ) as Character;

    function updateForm<K extends keyof ResourceForm>(
        key: K,
        value: ResourceForm[K],
    ) {
        setForm((previous) => ({ ...previous, [key]: value }));
    }

    function openAddModal() {
        setForm({ ...EMPTY_FORM });
        setSelectedName(null);
        setModalMode('add');
    }

    function openEditModal() {
        if (resources.length === 0) {
            showInfo(
                'Edit Resources',
                'No resources available to edit.',
            );
            return;
        }

        const resource = resources[0];

        setSelectedName(resource.name);
        setForm({
            name: resource.name,
            maximum: String(resource.maximum),
            current: String(resource.current),
            recovery: resource.recovery,
        });
        setModalMode('edit');
    }

    function openRecoverModal() {
        const recoverable = resources.filter(
            (resource) =>
                resource.recovery !== 'never' &&
                resource.current < resource.maximum,
        );

        if (recoverable.length === 0) {
            showInfo(
                'Recover Resources',
                'No resources are available to recover.',
            );
            return;
        }

        setSelectedName(recoverable[0].name);
        setRecoverAmount('1');
        setRecoverReason('');
        setModalMode('recover');
    }

    function selectResource(name: string) {
        setSelectedName(name);

        if (modalMode === 'edit') {
            const resource = resources.find((item) => item.name === name);

            if (!resource) return;

            setForm({
                name: resource.name,
                maximum: String(resource.maximum),
                current: String(resource.current),
                recovery: resource.recovery,
            });
        }

        if (modalMode === 'recover') {
            setRecoverAmount('1');
        }
    }

    async function useResource(name: string) {
        const original = resources.find((resource) => resource.name === name);

        if (!original || original.current <= 0) return;

        try {
            setSaving(true);

            const updatedCharacter = cloneCharacter();
            const resource = updatedCharacter.resources.find(
                (item) => item.name === name,
            );

            if (!resource || resource.current <= 0) return;

            resource.use(1);

            updatedCharacter.logs.push(
                `Used one use of ${resource.name}. Current: ${resource.current}/${resource.maximum}.`,
            );

            await onUpdate(updatedCharacter);
        } catch (error) {
            showInfo(
                'Cannot Use Resource',
                error instanceof Error
                    ? error.message
                    : 'Could not use this resource.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function saveResource() {
        const name = form.name.trim();
        const maximum = Number(form.maximum);
        const current = Number(form.current);

        if (!name) {
            showInfo('Missing Name', 'Enter a resource name.');
            return;
        }

        if (
            !Number.isInteger(maximum) ||
            maximum < 0 ||
            maximum > 9999
        ) {
            showInfo(
                'Invalid Maximum',
                'Maximum uses must be an integer between 0 and 9999.',
            );
            return;
        }

        if (
            !Number.isInteger(current) ||
            current < 0 ||
            current > maximum
        ) {
            showInfo(
                'Invalid Current Amount',
                'Current uses must be between 0 and the maximum.',
            );
            return;
        }

        const duplicate = resources.some(
            (resource) =>
                resource.name.toLowerCase() === name.toLowerCase() &&
                (modalMode === 'add' || resource.name !== selectedName),
        );

        if (duplicate) {
            showInfo(
                'Duplicate Resource',
                'A resource with this name already exists. Class actions refer to resources by name, so each name must be unique.',
            );
            return;
        }

        try {
            setSaving(true);

            const updatedCharacter = cloneCharacter();

            if (modalMode === 'add') {
                updatedCharacter.resources.push(
                    new CharacterResource(
                        name,
                        maximum,
                        maximum,
                        form.recovery,
                    ),
                );

                updatedCharacter.logs.push(
                    `Added resource: ${name} (${maximum}/${maximum}). Recovery: ${recoveryLabel(form.recovery)}.`,
                );
            } else if (modalMode === 'edit' && selectedName !== null) {
                const index = updatedCharacter.resources.findIndex(
                    (resource) => resource.name === selectedName,
                );

                if (index < 0) {
                    throw new Error('The selected resource no longer exists.');
                }

                const previousName = updatedCharacter.resources[index].name;

                updatedCharacter.resources[index] = new CharacterResource(
                    name,
                    maximum,
                    current,
                    form.recovery,
                );

                // Keep class actions linked when the resource is renamed.
                updatedCharacter.classActions.forEach((action) => {
                    if (action.resourceName === previousName) {
                        action.resourceName = name;
                    }
                });

                updatedCharacter.logs.push(
                    `Edited resource: ${previousName} → ${name} (${current}/${maximum}). Recovery: ${recoveryLabel(form.recovery)}.`,
                );
            }

            await onUpdate(updatedCharacter);
            setModalMode(null);
        } catch (error) {
            showInfo(
                'Save Failed',
                error instanceof Error
                    ? error.message
                    : 'Could not save the resource.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function recoverResource() {
        if (!selectedResource) return;

        const amount = Number(recoverAmount);
        const reason = recoverReason.trim();

        if (!Number.isInteger(amount) || amount <= 0) {
            showInfo(
                'Invalid Amount',
                'Enter a positive whole number.',
            );
            return;
        }

        if (!reason) {
            showInfo(
                'Missing Reason',
                'Enter a reason for recovering this resource.',
            );
            return;
        }

        const missing = selectedResource.maximum - selectedResource.current;

        if (amount > missing) {
            showInfo(
                'Invalid Amount',
                `You can recover at most ${missing} use(s).`,
            );
            return;
        }

        if (selectedResource.recovery === 'never') {
            showInfo(
                'Cannot Recover',
                'This resource is configured for no automatic recovery.',
            );
            return;
        }

        try {
            setSaving(true);

            const updatedCharacter = cloneCharacter();
            const resource = updatedCharacter.resources.find(
                (item) => item.name === selectedResource.name,
            );

            if (!resource) {
                throw new Error('The selected resource no longer exists.');
            }

            resource.restore(amount);

            updatedCharacter.logs.push(
                `Recovered ${amount} use(s) of ${resource.name}. Reason: ${reason}. Current: ${resource.current}/${resource.maximum}.`,
            );

            await onUpdate(updatedCharacter);
            setModalMode(null);
        } catch (error) {
            showInfo(
                'Recovery Failed',
                error instanceof Error
                    ? error.message
                    : 'Could not recover the resource.',
            );
        } finally {
            setSaving(false);
        }
    }

    function confirmDelete() {
        if (selectedName === null || saving) return;

        const resourceName = selectedName;

        showConfirm({
            title: 'Delete Resource',
            message: `Delete "${resourceName}"? Any class actions using this resource will no longer have a valid resource.`,
            cancelLabel: 'Cancel',
            confirmLabel: 'Delete',
            destructive: true,
            onConfirm: async () => {
                await deleteResource(resourceName);
            },
        });
    }

    async function deleteResource(name: string) {
        try {
            setSaving(true);

            const updatedCharacter = cloneCharacter();

            updatedCharacter.resources = updatedCharacter.resources.filter(
                (resource) => resource.name !== name,
            );

            updatedCharacter.logs.push(`Deleted resource: ${name}.`);

            await onUpdate(updatedCharacter);
            setModalMode(null);
        } catch (error) {
            showInfo(
                'Delete Failed',
                error instanceof Error
                    ? error.message
                    : 'Could not delete the resource.',
            );
        } finally {
            setSaving(false);
        }
    }

    const recoverableResources = resources.filter(
        (resource) =>
            resource.recovery !== 'never' &&
            resource.current < resource.maximum,
    );

    const modalTitle =
        modalMode === 'add'
            ? 'Add Resource'
            : modalMode === 'edit'
                ? 'Edit Resources'
                : 'Recover Resources';

    const selectedRecoverable =
        modalMode === 'recover'
            ? resources.find((resource) => resource.name === selectedName)
            : null;

    const missingUses = selectedRecoverable
        ? selectedRecoverable.maximum - selectedRecoverable.current
        : 0;

    function choice(
        label: string,
        selected: boolean,
        onPress: () => void,
    ) {
        return (
            <Pressable
                key={label}
                onPress={onPress}
                style={{
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: selected ? colors.accent : colors.border,
                    backgroundColor: selected
                        ? colors.backgroundSelected
                        : 'transparent',
                }}
            >
                <Text
                    style={{
                        color: colors.text,
                        fontSize: 12,
                        fontWeight: '600',
                    }}
                >
                    {label}
                </Text>
            </Pressable>
        );
    }

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
                }}
            >
                <View style={{ padding: 18, gap: 16 }}>
                    <Text
                        style={{
                            color: colors.accent,
                            fontSize: 11,
                            fontWeight: '800',
                            letterSpacing: 2,
                        }}
                    >
                        RESOURCES
                    </Text>

                    {resources.length === 0 ? (
                        <Text style={styles.secondary}>
                            No resources added yet.
                        </Text>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {resources.map((resource) => {
                                const percentage =
                                    resource.maximum > 0
                                        ? Math.min(
                                            100,
                                            Math.max(
                                                0,
                                                (resource.current /
                                                    resource.maximum) *
                                                100,
                                            ),
                                        )
                                        : 0;

                                return (
                                    <View
                                        key={resource.name}
                                        style={{
                                            padding: 12,
                                            gap: 9,
                                            borderRadius: 10,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            backgroundColor:
                                                'rgba(128,128,128,0.06)',
                                        }}
                                    >
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 8,
                                            }}
                                        >
                                            <View style={{ flex: 1, gap: 3 }}>
                                                <Text
                                                    style={{
                                                        color: colors.text,
                                                        fontSize: 13,
                                                        fontWeight: '700',
                                                    }}
                                                >
                                                    {resource.name}
                                                </Text>
                                                <Text style={styles.secondary}>
                                                    {recoveryLabel(
                                                        resource.recovery,
                                                    )}
                                                </Text>
                                            </View>

                                            <Text
                                                style={{
                                                    color: colors.accent,
                                                    fontSize: 12,
                                                    fontWeight: '700',
                                                }}
                                            >
                                                {resource.current}/
                                                {resource.maximum}
                                            </Text>

                                            <Pressable
                                                disabled={
                                                    saving ||
                                                    resource.current <= 0
                                                }
                                                onPress={() =>
                                                    void useResource(
                                                        resource.name,
                                                    )
                                                }
                                                style={[
                                                    styles.button,
                                                    {
                                                        paddingVertical: 6,
                                                        opacity:
                                                            saving ||
                                                                resource.current <= 0
                                                                ? 0.4
                                                                : 1,
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={styles.buttonText}
                                                >
                                                    Use
                                                </Text>
                                            </Pressable>
                                        </View>

                                        <View
                                            style={{
                                                height: 6,
                                                borderRadius: 3,
                                                overflow: 'hidden',
                                                backgroundColor: colors.border,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    height: '100%',
                                                    width: `${percentage}%`,
                                                    backgroundColor:
                                                        colors.accent,
                                                }}
                                            />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    <View
                        style={{
                            height: 1,
                            backgroundColor: colors.border,
                        }}
                    />

                    <View style={{ gap: 8 }}>
                        <Pressable
                            onPress={openAddModal}
                            style={styles.button}
                        >
                            <Text style={styles.buttonText}>
                                + Add Resource
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={openEditModal}
                            style={styles.button}
                        >
                            <Text style={styles.buttonText}>
                                Edit Resources
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={openRecoverModal}
                            style={styles.button}
                        >
                            <Text style={styles.buttonText}>
                                Recover Resources
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </BlurView>

            <Modal
                visible={modalMode !== null}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!saving) setModalMode(null);
                }}
            >
                <View
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 20,
                        backgroundColor: 'rgba(0,0,0,0.65)',
                    }}
                >
                    <View
                        style={{
                            width: '100%',
                            maxWidth: 600,
                            minWidth: 300,
                            maxHeight: '90%',
                            padding: 20,
                            borderRadius: 16,
                            gap: 16,
                            backgroundColor: colors.background,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <Text style={styles.title}>{modalTitle}</Text>

                        <ScrollView
                            style={{ flexGrow: 0, maxHeight: 500 }}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ gap: 14 }}
                        >
                            {modalMode === 'edit' && (
                                <View style={{ gap: 8 }}>
                                    <Text style={styles.label}>RESOURCE</Text>
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            flexWrap: 'wrap',
                                            gap: 8,
                                        }}
                                    >
                                        {resources.map((resource) =>
                                            choice(
                                                `${resource.name} (${resource.current}/${resource.maximum})`,
                                                selectedName === resource.name,
                                                () =>
                                                    selectResource(
                                                        resource.name,
                                                    ),
                                            ),
                                        )}
                                    </View>
                                </View>
                            )}

                            {modalMode === 'recover' && (
                                <View style={{ gap: 8 }}>
                                    <Text style={styles.label}>RESOURCE</Text>
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            flexWrap: 'wrap',
                                            gap: 8,
                                        }}
                                    >
                                        {recoverableResources.map((resource) =>
                                            choice(
                                                `${resource.name} (${resource.current}/${resource.maximum})`,
                                                selectedName === resource.name,
                                                () =>
                                                    selectResource(
                                                        resource.name,
                                                    ),
                                            ),
                                        )}
                                    </View>
                                </View>
                            )}

                            {(modalMode === 'add' ||
                                modalMode === 'edit') && (
                                    <>
                                        <View style={{ gap: 6 }}>
                                            <Text style={styles.label}>NAME</Text>
                                            <TextInput
                                                value={form.name}
                                                onChangeText={(value) =>
                                                    updateForm('name', value)
                                                }
                                                placeholder="Resource name"
                                                placeholderTextColor={
                                                    colors.textSecondary
                                                }
                                                style={styles.input}
                                                maxLength={100}
                                                editable={!saving}
                                            />
                                        </View>

                                        <View style={{ gap: 6 }}>
                                            <Text style={styles.label}>
                                                MAXIMUM USES
                                            </Text>
                                            <TextInput
                                                value={form.maximum}
                                                onChangeText={(value) => {
                                                    if (!/^\d*$/.test(value)) {
                                                        return;
                                                    }

                                                    setForm((previous) => ({
                                                        ...previous,
                                                        maximum: value,
                                                        current:
                                                            value !== '' &&
                                                                Number(
                                                                    previous.current,
                                                                ) > Number(value)
                                                                ? value
                                                                : previous.current,
                                                    }));
                                                }}
                                                keyboardType="number-pad"
                                                style={styles.input}
                                                editable={!saving}
                                            />
                                        </View>

                                        {modalMode === 'edit' && (
                                            <View style={{ gap: 6 }}>
                                                <Text style={styles.label}>
                                                    CURRENT USES
                                                </Text>
                                                <TextInput
                                                    value={form.current}
                                                    onChangeText={(value) => {
                                                        if (/^\d*$/.test(value)) {
                                                            updateForm(
                                                                'current',
                                                                value,
                                                            );
                                                        }
                                                    }}
                                                    keyboardType="number-pad"
                                                    style={styles.input}
                                                    editable={!saving}
                                                />
                                            </View>
                                        )}

                                        <View style={{ gap: 8 }}>
                                            <Text style={styles.label}>
                                                RECOVERY
                                            </Text>
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    flexWrap: 'wrap',
                                                    gap: 8,
                                                }}
                                            >
                                                {RECOVERY_OPTIONS.map((option) =>
                                                    choice(
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
                                        </View>
                                    </>
                                )}

                            {modalMode === 'recover' && (
                                <>
                                    <Text style={styles.secondary}>
                                        {selectedRecoverable
                                            ? `${missingUses} use(s) missing from ${selectedRecoverable.name}.`
                                            : 'Select a resource to recover.'}
                                    </Text>

                                    <View style={{ gap: 6 }}>
                                        <Text style={styles.label}>
                                            AMOUNT TO RECOVER
                                        </Text>
                                        <TextInput
                                            value={recoverAmount}
                                            onChangeText={(value) => {
                                                if (/^\d*$/.test(value)) {
                                                    setRecoverAmount(value);
                                                }
                                            }}
                                            keyboardType="number-pad"
                                            style={styles.input}
                                            editable={!saving}
                                        />
                                    </View>

                                    <View style={{ gap: 6 }}>
                                        <Text style={styles.label}>
                                            REASON
                                        </Text>
                                        <TextInput
                                            value={recoverReason}
                                            onChangeText={setRecoverReason}
                                            placeholder="e.g. Short Rest, Potion, Feature"
                                            placeholderTextColor={
                                                colors.textSecondary
                                            }
                                            style={styles.input}
                                            editable={!saving}
                                        />
                                    </View>
                                </>
                            )}
                        </ScrollView>

                        {modalMode === 'edit' && (
                            <Pressable
                                disabled={saving || selectedName === null}
                                onPress={confirmDelete}
                                style={[
                                    styles.button,
                                    {
                                        backgroundColor: colors.background,
                                        opacity:
                                            saving || selectedName === null
                                                ? 0.4
                                                : 1,
                                    },
                                ]}
                            >
                                <Text
                                    style={{
                                        ...styles.buttonText,
                                        color: '#C65B50',
                                    }}
                                >
                                    Delete Selected Resource
                                </Text>
                            </Pressable>
                        )}

                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 8,
                            }}
                        >
                            <View style={{ flex: 1 }}>
                                <Pressable
                                    disabled={saving}
                                    onPress={() => setModalMode(null)}
                                    style={[
                                        styles.button,
                                        saving && { opacity: 0.5 },
                                    ]}
                                >
                                    <Text style={styles.buttonText}>
                                        Cancel
                                    </Text>
                                </Pressable>
                            </View>

                            <View style={{ flex: 1 }}>
                                <Pressable
                                    disabled={
                                        saving ||
                                        (modalMode === 'recover' &&
                                            selectedRecoverable === null)
                                    }
                                    onPress={() => {
                                        if (modalMode === 'recover') {
                                            void recoverResource();
                                        } else {
                                            void saveResource();
                                        }
                                    }}
                                    style={[
                                        styles.button,
                                        {
                                            backgroundColor: colors.accent,
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
                                            : modalMode === 'recover'
                                                ? 'Recover'
                                                : 'Save'}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

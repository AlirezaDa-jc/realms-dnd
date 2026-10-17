
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useColorScheme,
} from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

export type DialogAction = {
    label: string;
    variant?: 'primary' | 'secondary' | 'destructive';
    onPress?: () => void | Promise<void>;
    closeOnPress?: boolean;
};

export type DialogOptions = {
    title: string;
    message?: string;
    actions?: DialogAction[];
    dismissible?: boolean;
};

type DialogContextValue = {
    showDialog: (options: DialogOptions) => void;
    showInfo: (title: string, message?: string) => void;
    showConfirm: (options: {
        title: string;
        message?: string;
        confirmLabel?: string;
        cancelLabel?: string;
        destructive?: boolean;
        onConfirm: () => void | Promise<void>;
    }) => void;
    closeDialog: () => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog() {
    const context = useContext(DialogContext);

    if (!context) {
        throw new Error(
            'useDialog must be used inside DialogProvider.',
        );
    }

    return context;
}

export function DialogProvider({
    children,
}: {
    children: ReactNode;
}) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    const [dialog, setDialog] = useState<DialogOptions | null>(null);
    const [busyIndex, setBusyIndex] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const closeDialog = useCallback(() => {
        if (busyIndex !== null) return;

        setDialog(null);
        setActionError(null);
    }, [busyIndex]);

    const showDialog = useCallback((options: DialogOptions) => {
        setActionError(null);
        setBusyIndex(null);
        setDialog({
            ...options,
            actions: options.actions ?? [{ label: 'OK', variant: 'primary' }],
        });
    }, []);

    const showInfo = useCallback(
        (title: string, message?: string) => {
            showDialog({
                title,
                message,
                actions: [{ label: 'OK', variant: 'primary' }],
            });
        },
        [showDialog],
    );

    const showConfirm = useCallback(
        (options: {
            title: string;
            message?: string;
            confirmLabel?: string;
            cancelLabel?: string;
            destructive?: boolean;
            onConfirm: () => void | Promise<void>;
        }) => {
            showDialog({
                title: options.title,
                message: options.message,
                dismissible: false,
                actions: [
                    {
                        label: options.cancelLabel ?? 'Cancel',
                        variant: 'secondary',
                    },
                    {
                        label: options.confirmLabel ?? 'Confirm',
                        variant: options.destructive ? 'destructive' : 'primary',
                        onPress: options.onConfirm,
                    },
                ],
            });
        },
        [showDialog],
    );

    const handleAction = async (index: number) => {
        if (!dialog || busyIndex !== null) return;

        const action = dialog.actions?.[index];
        if (!action) return;

        // Actions without callbacks simply dismiss the dialog.
        if (!action.onPress) {
            setDialog(null);
            setActionError(null);
            return;
        }

        setBusyIndex(index);
        setActionError(null);

        try {
            await action.onPress();

            if (action.closeOnPress !== false) {
                setDialog(null);
            }
        } catch (error) {
            setActionError(
                error instanceof Error
                    ? error.message
                    : 'Something went wrong. Please try again.',
            );
        } finally {
            setBusyIndex(null);
        }
    };

    const contextValue = useMemo(
        () => ({ showDialog, showInfo, showConfirm, closeDialog }),
        [showDialog, showInfo, showConfirm, closeDialog],
    );

    return (
        <DialogContext.Provider value={contextValue}>
            {children}

            <Modal
                visible={dialog !== null}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => {
                    if (dialog?.dismissible !== false) closeDialog();
                }}
            >
                <View style={styles.overlay}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        accessibilityLabel="Close dialog"
                        onPress={() => {
                            if (dialog?.dismissible !== false) closeDialog();
                        }}
                    />

                    <View
                        accessibilityRole="alert"
                        accessibilityViewIsModal
                        style={[
                            styles.dialog,
                            {
                                backgroundColor: colors.backgroundElement,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <View style={styles.header}>
                            <View style={[styles.titleMark, { backgroundColor: colors.accent }]} />
                            <Text style={[styles.title, { color: colors.text }]}>
                                {dialog?.title}
                            </Text>
                        </View>

                        {dialog?.message ? (
                            <ScrollView
                                style={styles.messageScroll}
                                contentContainerStyle={styles.messageContent}
                                showsVerticalScrollIndicator
                            >
                                <Text style={[styles.message, { color: colors.textSecondary }]}>
                                    {dialog.message}
                                </Text>
                            </ScrollView>
                        ) : null}

                        {actionError ? (
                            <Text style={styles.errorText}>{actionError}</Text>
                        ) : null}

                        <View style={styles.actions}>
                            {dialog?.actions?.map((action, index) => {
                                const variant = action.variant ?? 'secondary';
                                const isBusy = busyIndex === index;

                                const backgroundColor =
                                    variant === 'primary'
                                        ? colors.accent
                                        : variant === 'destructive'
                                            ? '#A93232'
                                            : 'transparent';

                                const foregroundColor =
                                    variant === 'primary' ? '#11100F' : colors.text;

                                return (
                                    <Pressable
                                        key={`${action.label}-${index}`}
                                        accessibilityRole="button"
                                        disabled={busyIndex !== null}
                                        onPress={() => void handleAction(index)}
                                        style={({ pressed }) => [
                                            styles.actionButton,
                                            {
                                                backgroundColor,
                                                borderColor:
                                                    variant === 'secondary'
                                                        ? colors.border
                                                        : backgroundColor,
                                            },
                                            pressed && busyIndex === null && styles.pressed,
                                            busyIndex !== null && styles.disabled,
                                        ]}
                                    >
                                        {isBusy ? (
                                            <ActivityIndicator
                                                size="small"
                                                color={foregroundColor}
                                            />
                                        ) : (
                                            <Text
                                                style={[
                                                    styles.actionText,
                                                    { color: foregroundColor },
                                                ]}
                                            >
                                                {action.label}
                                            </Text>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </Modal>
        </DialogContext.Provider>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.64)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.four,
    },
    dialog: {
        width: '100%',
        maxWidth: 440,
        maxHeight: '80%',
        borderWidth: 1,
        borderRadius: 18,
        padding: Spacing.four,
        gap: Spacing.four,
        elevation: 12,
        shadowColor: '#000',
        shadowOpacity: 0.24,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
    },
    titleMark: {
        width: 4,
        height: 28,
        borderRadius: 2,
    },
    title: {
        flex: 1,
        fontSize: 21,
        fontWeight: '700',
    },
    messageScroll: {
        flexGrow: 0,
        flexShrink: 1,
    },
    messageContent: {
        paddingBottom: 2,
    },
    message: {
        fontSize: 15,
        lineHeight: 23,
    },
    errorText: {
        color: '#E57373',
        fontSize: 13,
        lineHeight: 19,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: Spacing.two,
    },
    actionButton: {
        minWidth: 96,
        minHeight: 42,
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.two,
        borderWidth: 1,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        fontSize: 14,
        fontWeight: '700',
    },
    pressed: {
        opacity: 0.78,
    },
    disabled: {
        opacity: 0.55,
    },
});

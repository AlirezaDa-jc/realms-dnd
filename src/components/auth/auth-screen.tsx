import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  type TextInputProps,
} from 'react-native';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

type AuthScreenProps = {
  title: string;
  description: string;
  children: ReactNode;
};

type AuthFieldProps = TextInputProps & {
  label: string;
};

type AuthButtonProps = {
  title: string;
  busy: boolean;
  onPress: () => void;
};

function useAuthColors() {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}

export function AuthScreen({ title, description, children }: AuthScreenProps) {
  const colors = useAuthColors();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundElement,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.brand}>
          <View style={[styles.brandMark, { backgroundColor: colors.accent }]}>
            <Text style={[styles.brandMarkText, { color: colors.background }]}>R</Text>
          </View>
          <View>
            <Text style={[styles.brandName, { color: colors.text }]}>REALMS</Text>
            <Text style={[styles.brandCaption, { color: colors.textSecondary }]}>
              {'DUNGEONS & DRAGONS 2024'}
            </Text>
          </View>
        </View>

        <View style={styles.heading}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>
            WELCOME TO YOUR TABLE
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
        </View>

        <View style={styles.form}>{children}</View>
      </View>
      <Text style={[styles.footer, { color: colors.textSecondary }]}>
        Your world. Your characters. Your story.
      </Text>
    </ScrollView>
  );
}

export function AuthField({ label, style, ...props }: AuthFieldProps) {
  const colors = useAuthColors();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.accent}
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.text,
          },
          style,
        ]}
      />
    </View>
  );
}

export function RememberMe({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const colors = useAuthColors();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.rememberRow}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: value ? colors.accent : colors.border,
            backgroundColor: value ? colors.accent : 'transparent',
          },
        ]}
      >
        {value ? (
          <Text style={[styles.checkmark, { color: colors.background }]}>
            {'\u2713'}
          </Text>
        ) : null}
      </View>
      <View style={styles.rememberCopy}>
        <Text style={[styles.rememberLabel, { color: colors.text }]}>
          Remember me
        </Text>
        <Text style={[styles.rememberHint, { color: colors.textSecondary }]}>
          Stay signed in on this device
        </Text>
      </View>
    </Pressable>
  );
}

export function AuthButton({ title, busy, onPress }: AuthButtonProps) {
  const colors = useAuthColors();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.accent,
          opacity: pressed || busy ? 0.75 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.background} />
      ) : (
        <Text style={[styles.buttonText, { color: colors.background }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function AuthLink({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  const colors = useAuthColors();

  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={styles.linkButton}>
      <Text style={[styles.linkText, { color: colors.accent }]}>{title}</Text>
    </Pressable>
  );
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 480),
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { fontSize: 22, fontWeight: '900' },
  brandName: { fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  brandCaption: { marginTop: 2, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  heading: { gap: Spacing.one },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.4 },
  description: { fontSize: 14, lineHeight: 21 },
  form: { gap: Spacing.three },
  field: { gap: 7 },
  fieldLabel: { fontSize: 13, fontWeight: '700' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 15,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { fontSize: 14, fontWeight: '900', lineHeight: 17 },
  rememberCopy: { flex: 1, gap: 2 },
  rememberLabel: { fontSize: 13, fontWeight: '700' },
  rememberHint: { fontSize: 11 },
  button: {
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: { fontSize: 14, fontWeight: '800' },
  linkButton: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 8 },
  linkText: { fontSize: 13, fontWeight: '700' },
  error: { color: '#C45454', fontSize: 13, lineHeight: 18 },
  footer: { marginTop: Spacing.three, textAlign: 'center', fontSize: 11 },
});

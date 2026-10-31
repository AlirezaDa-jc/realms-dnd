
import { BlurView } from 'expo-blur';
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

import { Colors, Spacing } from '@/constants/theme';

export function useCampaignColors() {
  return Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

export function CampaignPage({
  title,
  subtitle,
  eyebrow = 'REALMS',
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const colors = useCampaignColors();

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[
              styles.eyebrow,
              { color: colors.accent },
            ]}
          >
            {eyebrow}
          </Text>

          <Text
            style={[
              styles.title,
              { color: colors.text },
            ]}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                { color: colors.textSecondary },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {children}
      </View>
    </ScrollView>
  );
}

export function CampaignCard({
  children,
}: {
  children: ReactNode;
}) {
  const colors = useCampaignColors();
  const scheme = useColorScheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundElement,
          borderColor: colors.border,
        },
      ]}
    >
      <BlurView
        intensity={scheme === 'dark' ? 20 : 35}
        tint={scheme === 'dark' ? 'dark' : 'light'}
        style={styles.cardBlur}
      >
        {children}
      </BlurView>
    </View>
  );
}

export function CampaignField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  const colors = useCampaignColors();

  return (
    <View style={styles.field}>
      <Text
        style={[
          styles.fieldLabel,
          { color: colors.text },
        ]}
      >
        {label}
      </Text>

      {children}

      {hint ? (
        <Text
          style={[
            styles.fieldHint,
            { color: colors.textSecondary },
          ]}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function CampaignInput({
  style,
  multiline,
  ...props
}: TextInputProps) {
  const colors = useCampaignColors();

  return (
    <TextInput
      {...props}
      multiline={multiline}
      placeholderTextColor={colors.textSecondary}
      selectionColor={colors.accent}
      style={[
        styles.input,
        multiline && styles.multilineInput,
        {
          color: colors.text,
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
        style,
      ]}
    />
  );
}

export function CampaignButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
}: {
  title: string;
  onPress(): void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const colors = useCampaignColors();
  const primary = variant === 'primary';
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{
        disabled: inactive,
        busy: loading,
      }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary
            ? colors.accent
            : colors.background,
          borderColor: primary
            ? colors.accent
            : colors.border,
          opacity: inactive ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={primary ? '#11100F' : colors.text}
        />
      ) : null}

      <Text
        style={[
          styles.buttonText,
          {
            color: primary ? '#11100F' : colors.text,
          },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function CampaignMessage({
  children,
}: {
  children: ReactNode;
}) {
  const colors = useCampaignColors();

  return (
    <View
      style={[
        styles.message,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        accessibilityLiveRegion="polite"
        style={[
          styles.messageText,
          { color: colors.textSecondary },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

export function CampaignLoading() {
  const colors = useCampaignColors();

  return (
    <View
      style={[
        styles.loading,
        { backgroundColor: colors.background },
      ]}
    >
      <ActivityIndicator
        size="large"
        color={colors.accent}
      />

      <Text
        style={[
          styles.loadingText,
          { color: colors.textSecondary },
        ]}
      >
        Loading campaigns...
      </Text>
    </View>
  );
}

export const campaignStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
});

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    padding: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: 100,
  },

  content: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    gap: 16,
  },

  header: {
    marginBottom: Spacing.four,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: Spacing.two,
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: Spacing.two,
  },

  card: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },

  cardBlur: {
    padding: 16,
    gap: 14,
  },

  field: {
    gap: 8,
  },

  fieldLabel: {
    fontSize: 16,
    fontWeight: '700',
  },

  fieldHint: {
    fontSize: 11,
    lineHeight: 16,
  },

  input: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 14,
  },

  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },

  button: {
    minHeight: 42,
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  buttonText: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },

  message: {
    borderWidth: 1,
    borderRadius: 9,
    padding: 12,
  },

  messageText: {
    fontSize: 12,
    lineHeight: 18,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },

  loadingText: {
    fontSize: 13,
  },
});


import {
  Redirect,
  router,
  useFocusEffect,
} from 'expo-router';
import {
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { CampaignRole } from '@/api/campaigns';
import { useCampaign } from '@/campaigns/campaign-context';
import { useSession } from '@/auth/session-context';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';

import CampaignInviteControl from './campaign-invite-control';

import {
  CampaignButton,
  CampaignLoading,
  CampaignMessage,
  CampaignPage,
} from './campaign-ui';

export default function CampaignBoundary({
  mode,
  children,
}: {
  mode: CampaignRole;
  children: ReactNode;
}) {
  const state = useCampaign();
  const { signOut } = useSession();

  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setChecking(true);
      setError('');

      void state
        .revalidate()
        .catch((cause: unknown) => {
          if (active) {
            setError(
              cause instanceof Error
                ? cause.message
                : 'Could not verify campaign access.',
            );
          }
        })
        .finally(() => {
          if (active) {
            setChecking(false);
          }
        });

      return () => {
        active = false;
      };
    }, [state]),
  );

  const handleSignOut = async () => {
    if (signingOut) return;

    setSigningOut(true);

    try {
      await signOut();
      router.replace('/');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not sign out.',
      );
    } finally {
      setSigningOut(false);
    }
  };

  if (state.loading) {
    return <CampaignLoading />;
  }

  if (!state.mode || state.mode !== mode) {
    return <Redirect href="/user" />;
  }

  if (!state.campaign) {
    return <Redirect href="/user/campaigns" />;
  }

  if (checking) {
    return <CampaignLoading />;
  }

  if (error) {
    return (
      <CampaignPage
        eyebrow="CAMPAIGN"
        title="Campaign unavailable"
        subtitle="We couldn't verify your access to this campaign."
      >
        <CampaignMessage>{error}</CampaignMessage>

        <CampaignButton
          title="Retry"
          onPress={() =>
            setAttempt((value) => value + 1)
          }
        />

        <CampaignButton
          title="Choose Campaign"
          variant="secondary"
          onPress={() =>
            router.replace('/user/campaigns')
          }
        />
      </CampaignPage>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      {/* Campaign header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.heading}>
          <Text
            style={[
              styles.eyebrow,
              {
                color: colors.accent,
              },
            ]}
          >
            {mode === 'dm'
              ? 'DUNGEON MASTER'
              : 'PLAYER'}
          </Text>

          <Text
            style={[
              styles.campaignName,
              {
                color: colors.text,
              },
            ]}
            numberOfLines={2}
          >
            {state.campaign.name}
          </Text>
        </View>

        {/* Campaign actions */}
        <View style={styles.actions}>
          {mode === 'dm' && state.campaign.role === 'dm' ? (
            <CampaignInviteControl campaign={state.campaign} />
          ) : null}
          <HeaderButton
            label="Change Campaign"
            onPress={() =>
              router.replace('/user/campaigns')
            }
            color={colors.text}
            backgroundColor={colors.backgroundElement}
            borderColor={colors.border}
          />

          <HeaderButton
            label="Change Role"
            onPress={() =>
              router.replace('/user')
            }
            color={colors.text}
            backgroundColor={colors.backgroundElement}
            borderColor={colors.border}
          />

          <HeaderButton
            label={
              signingOut
                ? 'Logging out...'
                : 'Log Out'
            }
            onPress={() => void handleSignOut()}
            disabled={signingOut}
            color={colors.textSecondary}
            backgroundColor={colors.background}
            borderColor={colors.border}
          />
        </View>
      </View>

      {/* Active campaign screen */}
      <View
        key={`${state.campaign.id}:${mode}`}
        style={styles.content}
      >
        {children}
      </View>
    </View>
  );
}

function HeaderButton({
  label,
  onPress,
  disabled = false,
  color,
  backgroundColor,
  borderColor,
}: {
  label: string;
  onPress(): void;
  disabled?: boolean;
  color: string;
  backgroundColor: string;
  borderColor: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerButton,
        {
          backgroundColor,
          borderColor,
          opacity: disabled
            ? 0.5
            : pressed
              ? 0.7
              : 1,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.headerButtonText,
          { color },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    borderBottomWidth: 1,
    gap: 16,
  },

  heading: {
    gap: 6,
    paddingTop: Spacing.four,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },

  campaignName: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 39,
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },

  headerButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },

  content: {
    flex: 1,
    minHeight: 0,
  },
});

import { createCampaignInvite, type Campaign } from '@/api/campaigns';
import { useState } from 'react';
import * as Linking from 'expo-linking';
import {
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  CampaignButton,
  CampaignMessage,
  useCampaignColors,
} from './campaign-ui';

export default function CampaignInviteControl({
  campaign,
}: {
  campaign: Campaign;
}) {
  const colors = useCampaignColors();
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function createInvite() {
    if (busy) return;

    setBusy(true);
    setDialogVisible(true);
    setError('');
    setStatus('');

    try {
      const invite = await createCampaignInvite(campaign.id);
      setInviteUrl(
        Linking.createURL('/user/campaigns/join', {
          queryParams: { code: invite.code },
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not create an invitation.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function shareInvite() {
    if (!inviteUrl) return;

    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(inviteUrl);
          setStatus('Invitation link copied.');
        } else {
          setStatus('Select and copy the invitation link above.');
        }
        return;
      }

      await Share.share({
        title: `Join ${campaign.name}`,
        message: `Join ${campaign.name} in Realms: ${inviteUrl}`,
        url: inviteUrl,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not share the invitation link.',
      );
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Invite players"
        disabled={busy}
        onPress={() => void createInvite()}
        style={({ pressed }) => [
          styles.headerButton,
          {
            backgroundColor: colors.accent,
            borderColor: colors.accent,
            opacity: busy ? 0.5 : pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text style={styles.headerButtonText}>
          {busy ? 'Creating invite...' : 'Invite Players'}
        </Text>
      </Pressable>

      <Modal
        visible={dialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDialogVisible(false);
          setInviteUrl('');
        }}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.dialog,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.title, { color: colors.text }]}>
              Invite players
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Share this link with players. It opens the join campaign screen
              with the invitation code filled in.
            </Text>
            {busy ? (
              <CampaignMessage>Creating a secure invitation...</CampaignMessage>
            ) : null}
            {inviteUrl ? (
              <Text
                selectable
                style={[
                  styles.link,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                {inviteUrl}
              </Text>
            ) : null}
            {status ? <CampaignMessage>{status}</CampaignMessage> : null}
            {error ? <CampaignMessage>{error}</CampaignMessage> : null}
            <View style={styles.actions}>
              {inviteUrl ? (
                <CampaignButton
                  title="Copy / Share Link"
                  onPress={() => void shareInvite()}
                />
              ) : null}
              <CampaignButton
                title="Close"
                variant="secondary"
                onPress={() => {
                  setDialogVisible(false);
                  setInviteUrl('');
                  setError('');
                  setStatus('');
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
    color: '#11100F',
    fontSize: 12,
    fontWeight: '800',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  dialog: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 14,
    padding: 20,
    borderWidth: 1,
    borderRadius: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 13,
  },
  actions: {
    gap: 10,
  },
});

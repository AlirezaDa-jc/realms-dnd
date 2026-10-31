
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import {
  createCampaign,
  joinCampaign,
} from '@/api/campaigns';
import { useCampaign } from '@/campaigns/campaign-context';

import {
  CampaignButton,
  CampaignCard,
  CampaignField,
  CampaignInput,
  CampaignLoading,
  CampaignMessage,
  CampaignPage,
  useCampaignColors,
} from './campaign-ui';

export default function CampaignForm({
  action,
}: {
  action: 'create' | 'join';
}) {
  const state = useCampaign();
  const colors = useCampaignColors();
  const { code } = useLocalSearchParams<{ code?: string | string[] }>();
  const invitationCode = Array.isArray(code) ? code[0] ?? '' : code ?? '';

  const [name, setName] = useState(invitationCode);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const creating = action === 'create';

  const title = creating
    ? 'Create Campaign'
    : 'Join Campaign';

  const subtitle = creating
    ? 'Build a new adventure and gather your party.'
    : 'Enter an invitation code to join an existing adventure.';

  const valid = name.trim().length > 0;

  async function submit() {
    if (busy || !valid) return;

    setBusy(true);
    setError('');

    try {
      const campaign = creating
        ? await createCampaign(
          name.trim(),
          description.trim(),
        )
        : await joinCampaign(name.trim());

      await state.selectCampaign(campaign.id);

      router.replace(
        creating ? '/user/dm' : '/user/player',
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not save campaign.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (state.loading) {
    return <CampaignLoading />;
  }

  if (state.mode !== (creating ? 'dm' : 'player')) {
    return <Redirect href="/user/campaigns" />;
  }

  return (
    <CampaignPage
      eyebrow={creating ? 'DUNGEON MASTER' : 'PLAYER'}
      title={title}
      subtitle={subtitle}
    >
      <CampaignCard>
        <View style={{ gap: 5 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: '800',
            }}
          >
            {creating
              ? 'Campaign Information'
              : 'Campaign Invitation'}
          </Text>

          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            {creating
              ? 'Give your adventure a name and a short description.'
              : 'Use the invitation code provided by your Dungeon Master.'}
          </Text>
        </View>

        <CampaignField
          label={creating ? 'Campaign Name' : 'Invitation Code'}
        >
          <CampaignInput
            accessibilityLabel={
              creating ? 'Campaign name' : 'Invitation code'
            }
            placeholder={
              creating
                ? 'e.g. The Shattered Kingdom'
                : 'Enter invitation code'
            }
            value={name}
            onChangeText={setName}
            maxLength={creating ? 120 : 100}
            autoCapitalize={creating ? 'sentences' : 'none'}
            autoCorrect={false}
            editable={!busy}
            returnKeyType="done"
          />
        </CampaignField>

        {creating ? (
          <CampaignField
            label="Description"
            hint="Optional. Describe the world, story, or adventure."
          >
            <CampaignInput
              accessibilityLabel="Description"
              placeholder="Tell your players about the adventure..."
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={2000}
              editable={!busy}
            />
          </CampaignField>
        ) : null}

        {error ? (
          <CampaignMessage>{error}</CampaignMessage>
        ) : null}

        <View style={{ gap: 10, marginTop: 6 }}>
          <CampaignButton
            title={
              creating
                ? 'Create Campaign'
                : 'Join Campaign'
            }
            loading={busy}
            disabled={!valid}
            onPress={() => void submit()}
          />

          <CampaignButton
            title="Back to Campaigns"
            variant="secondary"
            disabled={busy}
            onPress={() =>
              router.replace('/user/campaigns')
            }
          />
        </View>
      </CampaignCard>
    </CampaignPage>
  );
}

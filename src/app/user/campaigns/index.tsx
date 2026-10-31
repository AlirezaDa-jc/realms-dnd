import { campaignsForRole } from '@/campaigns/selection';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { listCampaigns, type Campaign } from '@/api/campaigns';
import { useCampaign } from '@/campaigns/campaign-context';
import {
  CampaignButton,
  CampaignLoading,
  CampaignMessage,
  CampaignPage,
  campaignStyles,
  useCampaignColors,
} from '@/components/campaigns/campaign-ui';

export default function CampaignSelection() {
  const state = useCampaign();
  const colors = useCampaignColors();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setCampaigns([]);
      setError('');
      void listCampaigns()
        .then((items) => {
          if (active) setCampaigns(campaignsForRole(items, state.mode));
        })
        .catch((cause: unknown) => {
          if (active)
            setError(
              cause instanceof Error
                ? cause.message
                : 'Could not load campaigns.',
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [state.mode, attempt]),
  );

  async function open(id: string) {
    setBusy(true);
    setError('');
    try {
      const campaign = await state.selectCampaign(id);
      router.replace(campaign.role === 'dm' ? '/user/dm' : '/user/player');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not open campaign.',
      );
    } finally {
      setBusy(false);
    }
  }
  if (state.loading) return <CampaignLoading />;
  if (!state.mode) return <Redirect href="/user" />;
  return (
    <CampaignPage
      title={
        state.mode === 'dm'
          ? 'Your campaigns as DM'
          : 'Your campaigns as Player'
      }
    >
      <CampaignButton
        title="Change role"
        onPress={() => router.replace('/user')}
      />
      <CampaignButton
        title={
          state.mode === 'dm' ? 'Create campaign' : 'Join with invitation code'
        }
        onPress={() =>
          router.push(
            state.mode === 'dm'
              ? '/user/campaigns/create'
              : '/user/campaigns/join',
          )
        }
      />
      {loading ? (
        <CampaignLoading />
      ) : campaigns.length === 0 && !error ? (
        <CampaignMessage>No campaigns in this mode yet.</CampaignMessage>
      ) : null}
      {error ? (
        <>
          <CampaignMessage>{error}</CampaignMessage>
          <CampaignButton
            title="Retry"
            onPress={() => setAttempt((value) => value + 1)}
          />
        </>
      ) : null}
      {campaigns.map((campaign) => (
        <Pressable
          key={campaign.id}
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void open(campaign.id)}
          style={[
            campaignStyles.card,
            {
              backgroundColor: colors.backgroundElement,
              borderColor: colors.border,
              opacity: busy ? 0.5 : 1,
            },
          ]}
        >
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>
            {campaign.name}
          </Text>
          <CampaignMessage>
            {campaign.description || 'No description yet.'}
          </CampaignMessage>
          <CampaignMessage>
            {campaign.role === 'dm' ? 'Dungeon Master' : 'Player'}
            {campaign.member_count !== undefined
              ? ` | ${campaign.member_count} members`
              : ''}
          </CampaignMessage>
          {state.campaign?.id === campaign.id ? (
            <CampaignMessage>Previously selected</CampaignMessage>
          ) : null}
        </Pressable>
      ))}
    </CampaignPage>
  );
}

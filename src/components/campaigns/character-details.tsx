import { listCharacters } from '@/api/characters';
import { useCampaign } from '@/campaigns/campaign-context';
import MainLayout from '@/components/main-window/main-layout';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  CampaignButton,
  CampaignLoading,
  CampaignMessage,
  CampaignPage,
} from './campaign-ui';

export default function CharacterDetails({
  id,
  campaignScoped = false,
}: {
  id?: string;
  campaignScoped?: boolean;
}) {
  const { campaign } = useCampaign();
  const [access, setAccess] = useState<
    'loading' | 'owner' | 'reader' | 'error'
  >('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setAccess('loading');
      async function check() {
        if (!id)
          throw new Error('Choose a character from Party or Characters.');
        const owned = await listCharacters();
        if (campaignScoped) {
          if (!campaign) throw new Error('Choose a campaign first.');
          const assigned = await listCharacters({ campaignId: campaign.id });
          if (!assigned.some((item) => item.id === id))
            throw new Error(
              'This character is no longer assigned to this campaign.',
            );
        }
        const owner = owned.some((item) => item.id === id);
        if (!campaignScoped && !owner)
          throw new Error('This character is not in your library.');
        if (active) setAccess(owner ? 'owner' : 'reader');
      }
      void check().catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Could not load character.',
          );
          setAccess('error');
        }
      });
      return () => {
        active = false;
      };
    }, [id, campaign?.id, campaignScoped, attempt]),
  );
  if (access === 'loading') return <CampaignLoading />;
  if (access === 'error')
    return (
      <CampaignPage title="Character details">
        <CampaignMessage>{error}</CampaignMessage>
        <CampaignButton
          title="Retry"
          onPress={() => setAttempt((value) => value + 1)}
        />
      </CampaignPage>
    );
  return <MainLayout key={id} characterId={id} readOnly={access !== 'owner'} showHeader={!campaignScoped} />;
}

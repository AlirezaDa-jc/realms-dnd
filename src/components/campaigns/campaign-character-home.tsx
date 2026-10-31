import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import { listCharacters, type CharacterSummary } from '@/api/characters';
import { useCampaign } from '@/campaigns/campaign-context';
import MainLayout from '@/components/main-window/main-layout';
import {
  CampaignButton,
  CampaignLoading,
  CampaignMessage,
  CampaignPage,
  campaignStyles,
} from './campaign-ui';

export default function CampaignCharacterHome() {
  const { campaign, characterId, selectCharacter } = useCampaign();
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setCharacters([]);
      setLoading(true);
      setError('');
      if (!campaign) return;
      void listCharacters({ campaignId: campaign.id })
        .then((items) => {
          if (active) setCharacters(items);
        })
        .catch((cause: unknown) => {
          if (active)
            setError(
              cause instanceof Error
                ? cause.message
                : 'Could not load campaign characters.',
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [campaign?.id, attempt]),
  );
  if (loading) return <CampaignLoading />;
  if (error)
    return (
      <CampaignPage title="Character unavailable">
        <CampaignMessage>{error}</CampaignMessage>
        <CampaignButton
          title="Retry"
          onPress={() => setAttempt((value) => value + 1)}
        />
      </CampaignPage>
    );
  if (!characters.length)
    return (
      <CampaignPage title="Your campaign character">
        <CampaignMessage>
          You have no character assigned to this campaign. Choose one from your
          character library.
        </CampaignMessage>
        <CampaignButton
          title="Choose an existing character"
          onPress={() => router.push('/user/player/characters')}
        />
      </CampaignPage>
    );
  const selected =
    characters.find((item) => item.id === characterId) ?? characters[0];
  return (
    <View style={{ flex: 1 }}>
      {characters.length > 1 && (
        <View style={[campaignStyles.row, { padding: 12 }]}>
          {characters.map((item) => (
            <CampaignButton
              key={item.id}
              title={`${item.id === selected.id ? 'Selected: ' : ''}${item.name}`}
              onPress={() => selectCharacter(item.id)}
            />
          ))}
        </View>
      )}
      <MainLayout key={selected.id} characterId={selected.id} />
    </View>
  );
}

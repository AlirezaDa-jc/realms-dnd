import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import { assignCharacter } from '@/api/campaigns';
import { listCharacters, type CharacterSummary } from '@/api/characters';
import { useCampaign } from '@/campaigns/campaign-context';
import { CampaignButton, CampaignMessage, campaignStyles } from './campaign-ui';

export default function AssignCharacter({
  onAssigned,
}: {
  onAssigned(): void;
}) {
  const { campaign } = useCampaign();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CharacterSummary[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!open || !campaign) return;
      setItems([]);
      setBusy(true);
      setError('');
      void Promise.all([
        listCharacters(),
        listCharacters({ campaignId: campaign.id }),
      ])
        .then(([owned, assigned]) => {
          if (active)
            setItems(
              owned.filter(
                (item) => !assigned.some((other) => other.id === item.id),
              ),
            );
        })
        .catch((cause: unknown) => {
          if (active)
            setError(
              cause instanceof Error
                ? cause.message
                : 'Could not load characters.',
            );
        })
        .finally(() => {
          if (active) setBusy(false);
        });
      return () => {
        active = false;
      };
    }, [campaign?.id, open, attempt]),
  );
  async function assign(id: string) {
    if (!campaign || busy) return;
    setBusy(true);
    setError('');
    try {
      await assignCharacter(campaign.id, id);
      setItems((current) => current.filter((item) => item.id !== id));
      onAssigned();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Assignment failed.');
    } finally {
      setBusy(false);
    }
  }
  if (!campaign) return null;
  return (
    <View style={{ gap: 10, paddingVertical: 12 }}>
      <CampaignButton
        title={open ? 'Close assignment list' : 'Assign one of your characters'}
        onPress={() => setOpen((value) => !value)}
      />
      {open && (
        <>
          <CampaignMessage>
            Assign to {campaign.name}. Only characters you own are listed.
          </CampaignMessage>
          {busy && <CampaignMessage>Loading...</CampaignMessage>}
          {error ? (
            <>
              <CampaignMessage>{error}</CampaignMessage>
              <CampaignButton
                title="Retry"
                onPress={() => setAttempt((value) => value + 1)}
              />
            </>
          ) : null}
          {!busy && !error && !items.length && (
            <CampaignMessage>
              No unassigned characters. Create a character first.
            </CampaignMessage>
          )}
          <View style={campaignStyles.row}>
            {items.map((item) => (
              <CampaignButton
                key={item.id}
                title={item.name}
                disabled={busy}
                onPress={() => void assign(item.id)}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

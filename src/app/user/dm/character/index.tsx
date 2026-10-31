import { useLocalSearchParams } from 'expo-router';
import { useCampaign } from '@/campaigns/campaign-context';
import CharacterDetails from '@/components/campaigns/character-details';
export default function CampaignCharacterDetails() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { characterId } = useCampaign();
  return (
    <CharacterDetails id={id ?? characterId ?? undefined} campaignScoped />
  );
}

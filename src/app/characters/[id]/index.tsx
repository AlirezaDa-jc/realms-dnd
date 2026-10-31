import { useLocalSearchParams } from 'expo-router';
import CharacterDetails from '@/components/campaigns/character-details';
export default function OwnedCharacterDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CharacterDetails id={id} />;
}

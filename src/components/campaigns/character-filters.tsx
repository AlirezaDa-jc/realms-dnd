import { useState } from 'react';
import { View } from 'react-native';
import type { CharacterFilters } from '@/api/characters';
import {
  CampaignButton,
  CampaignInput,
  CampaignMessage,
  campaignStyles,
} from './campaign-ui';

export default function CharacterFiltersPanel({
  value,
  onChange,
}: {
  value: CharacterFilters;
  onChange(value: CharacterFilters): void;
}) {
  const [minimum, setMinimum] = useState(value.minChallengeRating?.toString() ?? '');
  const [maximum, setMaximum] = useState(value.maxChallengeRating?.toString() ?? '');
  const [error, setError] = useState('');
  function applyRange() {
    const min = minimum.trim() ? Number(minimum) : undefined;
    const max = maximum.trim() ? Number(maximum) : undefined;
    if ((min !== undefined && (!Number.isFinite(min) || min < 0)) ||
        (max !== undefined && (!Number.isFinite(max) || max < 0)) ||
        (min !== undefined && max !== undefined && min > max)) {
      setError('Enter a valid non-negative CR range. Minimum cannot exceed maximum.');
      return;
    }
    setError('');
    onChange({ ...value, minChallengeRating: min, maxChallengeRating: max });
  }
  return (
    <View style={{ gap: 10, paddingVertical: 12 }}>
      <CampaignMessage>Category</CampaignMessage>
      <View style={campaignStyles.row}>
        {['All', 'Player Character', 'NPC', 'Monster'].map((label) => (
          <CampaignButton
            key={label}
            title={`${(value.category ?? 'All') === label ? 'Selected: ' : ''}${label}`}
            onPress={() =>
              onChange({
                ...value,
                category: label === 'All' ? undefined : label,
              })
            }
          />
        ))}
      </View>
      <CampaignMessage>Encounter role</CampaignMessage>
      <View style={campaignStyles.row}>
        {['All', 'Boss', 'MiniBoss', 'Creep'].map((label) => (
          <CampaignButton
            key={label}
            title={`${(value.encounterRole ?? 'All') === label ? 'Selected: ' : ''}${label}`}
            onPress={() =>
              onChange({
                ...value,
                encounterRole: label === 'All' ? undefined : label,
              })
            }
          />
        ))}
      </View>
      <View style={campaignStyles.row}>
        {(['All', 'Party', 'Non-party'] as const).map((label) => (
          <CampaignButton
            key={label}
            title={label}
            onPress={() =>
              onChange({
                ...value,
                party: label === 'All' ? undefined : label === 'Party',
              })
            }
          />
        ))}
      </View>
      <CampaignInput accessibilityLabel="Minimum Challenge Rating" placeholder="Minimum CR" keyboardType="decimal-pad" value={minimum} onChangeText={setMinimum} />
      <CampaignInput accessibilityLabel="Maximum Challenge Rating" placeholder="Maximum CR" keyboardType="decimal-pad" value={maximum} onChangeText={setMaximum} />
      {error ? <CampaignMessage>{error}</CampaignMessage> : null}
      <CampaignButton title="Apply CR range" onPress={applyRange} />
      <CampaignButton title="Clear filters" onPress={() => { setMinimum(''); setMaximum(''); setError(''); onChange({}); }} />
    </View>
  );
}

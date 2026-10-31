import { useState } from 'react';
import { View } from 'react-native';

import type { CharacterFilters } from '@/api/characters';
import {
  CampaignButton,
  CampaignCard,
  CampaignField,
  CampaignInput,
  CampaignMessage,
  campaignStyles,
} from './campaign-ui';

const CATEGORIES = ['All', 'Player Character', 'NPC', 'Monster'];
const ENCOUNTER_ROLES = ['All', 'Boss', 'MiniBoss', 'Creep'];
const PARTY_OPTIONS = ['All', 'Party', 'Non-party'] as const;

export default function CharacterFiltersPanel({
  value,
  onChange,
}: {
  value: CharacterFilters;
  onChange(value: CharacterFilters): void;
}) {
  const initialCategory = value.category ?? '';
  const initialRole = value.encounterRole ?? '';
  const [category, setCategory] = useState(
    CATEGORIES.includes(initialCategory) ? initialCategory : 'All',
  );
  const [customCategory, setCustomCategory] = useState(
    CATEGORIES.includes(initialCategory) ? '' : initialCategory,
  );
  const [encounterRole, setEncounterRole] = useState(
    ENCOUNTER_ROLES.includes(initialRole) ? initialRole : 'All',
  );
  const [customEncounterRole, setCustomEncounterRole] = useState(
    ENCOUNTER_ROLES.includes(initialRole) ? '' : initialRole,
  );
  const [party, setParty] = useState(value.party);
  const [minimum, setMinimum] = useState(
    value.minChallengeRating?.toString() ?? '',
  );
  const [maximum, setMaximum] = useState(
    value.maxChallengeRating?.toString() ?? '',
  );
  const [error, setError] = useState('');

  const selectedCategory = customCategory.trim() ? 'Custom' : category;
  const selectedRole = customEncounterRole.trim() ? 'Custom' : encounterRole;
  const selectedParty =
    party === undefined ? 'All' : party ? 'Party' : 'Non-party';

  function applyFilters() {
    const min = minimum.trim() ? Number(minimum) : undefined;
    const max = maximum.trim() ? Number(maximum) : undefined;

    if (
      (min !== undefined && (!Number.isFinite(min) || min < 0)) ||
      (max !== undefined && (!Number.isFinite(max) || max < 0)) ||
      (min !== undefined && max !== undefined && min > max)
    ) {
      setError(
        'Enter a valid non-negative CR range. Minimum cannot exceed maximum.',
      );
      return;
    }

    setError('');
    onChange({
      category:
        customCategory.trim() ||
        (category === 'All' ? undefined : category),
      encounterRole:
        customEncounterRole.trim() ||
        (encounterRole === 'All' ? undefined : encounterRole),
      party,
      minChallengeRating: min,
      maxChallengeRating: max,
    });
  }

  return (
    <View style={{ gap: 12, paddingVertical: 12 }}>
      <CampaignCard>
        <CampaignField label="Category">
          <View style={campaignStyles.row}>
            {CATEGORIES.map((option) => (
              <CampaignButton
                key={option}
                title={`${selectedCategory === option ? 'Selected: ' : ''}${option}`}
                variant="secondary"
                onPress={() => {
                  setCategory(option);
                  setCustomCategory('');
                }}
              />
            ))}
          </View>
          <CampaignInput
            accessibilityLabel="Custom category"
            placeholder="Custom category"
            value={customCategory}
            onChangeText={(text) => {
              setCategory('All');
              setCustomCategory(text);
            }}
            autoCapitalize="words"
          />
        </CampaignField>
      </CampaignCard>

      <CampaignCard>
        <CampaignField label="Encounter role">
          <View style={campaignStyles.row}>
            {ENCOUNTER_ROLES.map((option) => (
              <CampaignButton
                key={option}
                title={`${selectedRole === option ? 'Selected: ' : ''}${option}`}
                variant="secondary"
                onPress={() => {
                  setEncounterRole(option);
                  setCustomEncounterRole('');
                }}
              />
            ))}
          </View>
          <CampaignInput
            accessibilityLabel="Custom encounter role"
            placeholder="Custom encounter role"
            value={customEncounterRole}
            onChangeText={(text) => {
              setEncounterRole('All');
              setCustomEncounterRole(text);
            }}
            autoCapitalize="words"
          />
        </CampaignField>
      </CampaignCard>

      <CampaignCard>
        <CampaignField label="Party">
          <View style={campaignStyles.row}>
            {PARTY_OPTIONS.map((option) => (
              <CampaignButton
                key={option}
                title={`${selectedParty === option ? 'Selected: ' : ''}${option}`}
                variant="secondary"
                onPress={() =>
                  setParty(option === 'All' ? undefined : option === 'Party')
                }
              />
            ))}
          </View>
        </CampaignField>
      </CampaignCard>

      <CampaignCard>
        <CampaignField label="Challenge Rating">
          <View style={campaignStyles.row}>
            <View style={{ flex: 1, minWidth: 120 }}>
              <CampaignInput
                accessibilityLabel="Minimum Challenge Rating"
                placeholder="Minimum CR"
                keyboardType="decimal-pad"
                value={minimum}
                onChangeText={setMinimum}
              />
            </View>
            <View style={{ flex: 1, minWidth: 120 }}>
              <CampaignInput
                accessibilityLabel="Maximum Challenge Rating"
                placeholder="Maximum CR"
                keyboardType="decimal-pad"
                value={maximum}
                onChangeText={setMaximum}
              />
            </View>
          </View>
        </CampaignField>
      </CampaignCard>

      {error ? <CampaignMessage>{error}</CampaignMessage> : null}
      <CampaignButton title="Apply Filters" onPress={applyFilters} />
    </View>
  );
}

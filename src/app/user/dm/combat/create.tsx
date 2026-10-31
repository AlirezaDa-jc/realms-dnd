import { useCampaign } from '@/campaigns/campaign-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

import { saveCombat } from '@/api/combats';
import {
  CharacterSummary,
  listCharacters,
  loadCharacter,
} from '@/api/characters';
import { Combat, CombatantRef } from '@/models/combat';

type Team = 'team1' | 'team2';
type PartyFilter = 'all' | 'party' | 'non_party';

const CATEGORY_OPTIONS = ['All', 'Player Character', 'NPC', 'Monster'];

const ROLE_OPTIONS = ['All', 'Boss', 'MiniBoss', 'Creep'];

export default function CreateCombatScreen() {
  const { campaign } = useCampaign();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [selectedTeam1, setSelectedTeam1] = useState<string[]>([]);
  const [selectedTeam2, setSelectedTeam2] = useState<string[]>([]);

  const [combatName, setCombatName] = useState('');

  const [search, setSearch] = useState('');
  const [partyFilter, setPartyFilter] = useState<PartyFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [minCR, setMinCR] = useState('');
  const [maxCR, setMaxCR] = useState('');

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [targetTeam, setTargetTeam] = useState<Team>('team1');

  const refreshCharacters = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      setCharacters(await listCharacters({ campaignId: campaign!.id }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load characters.',
      );
    } finally {
      setLoading(false);
    }
  }, [campaign]);

  useFocusEffect(useCallback(() => {
    void refreshCharacters();
  }, [refreshCharacters]));

  const filteredCharacters = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const min = minCR.trim() === '' ? null : Number(minCR);
    const max = maxCR.trim() === '' ? null : Number(maxCR);

    return characters.filter((character) => {
      if (
        normalizedSearch &&
        !character.name.toLowerCase().includes(normalizedSearch)
      ) {
        return false;
      }

      if (partyFilter === 'party' && character.party !== 1) {
        return false;
      }

      if (partyFilter === 'non_party' && character.party !== 0) {
        return false;
      }

      if (
        categoryFilter !== 'All' &&
        character.category.toLowerCase() !== categoryFilter.toLowerCase()
      ) {
        return false;
      }

      if (
        roleFilter !== 'All' &&
        character.encounter_role.toLowerCase() !== roleFilter.toLowerCase()
      ) {
        return false;
      }

      if (min !== null && Number.isFinite(min)) {
        if (
          character.challenge_rating === null ||
          character.challenge_rating < min
        ) {
          return false;
        }
      }

      if (max !== null && Number.isFinite(max)) {
        if (
          character.challenge_rating === null ||
          character.challenge_rating > max
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    characters,
    search,
    partyFilter,
    categoryFilter,
    roleFilter,
    minCR,
    maxCR,
  ]);

  const selectedIds = new Set([...selectedTeam1, ...selectedTeam2]);

  function toggleCharacter(characterId: string) {
    const isSelectedInTeam1 = selectedTeam1.includes(characterId);
    const isSelectedInTeam2 = selectedTeam2.includes(characterId);

    // Remove from the current team if already selected there.
    if (targetTeam === 'team1' && isSelectedInTeam1) {
      setSelectedTeam1((current) => current.filter((id) => id !== characterId));
      return;
    }

    if (targetTeam === 'team2' && isSelectedInTeam2) {
      setSelectedTeam2((current) => current.filter((id) => id !== characterId));
      return;
    }

    // A character cannot belong to both teams.
    if (isSelectedInTeam1 || isSelectedInTeam2) {
      return;
    }

    if (targetTeam === 'team1') {
      setSelectedTeam1((current) => [...current, characterId]);
    } else {
      setSelectedTeam2((current) => [...current, characterId]);
    }
  }

  function formatCR(cr: number | null): string {
    if (cr === null) return 'CR —';
    return `CR ${cr}`;
  }

  async function createCombat() {
    if (creating) return;

    if (selectedTeam1.length === 0 || selectedTeam2.length === 0) {
      setError('Choose at least one character for each team.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const [team1Characters, team2Characters] = await Promise.all([
        Promise.all(selectedTeam1.map((id) => loadCharacter(id))),
        Promise.all(selectedTeam2.map((id) => loadCharacter(id))),
      ]);

      const team1: CombatantRef[] = team1Characters.map((character) => ({
        characterId: character.id,
      }));

      const team2: CombatantRef[] = team2Characters.map((character) => ({
        characterId: character.id,
      }));

      const now = new Date().toISOString();

      const combat = new Combat({
        campaignId: campaign!.id,
        name: combatName.trim() || 'Untitled Combat',
        status: 'active',
        outcome: null,
        team1,
        team2,
        createdAt: now,
        startedAt: now,
        finishedAt: null,
      });

      await saveCombat(combat);

      router.replace({
        pathname: '/user/dm/combat/[id]',
        params: { id: combat.id },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create combat.');
    } finally {
      setCreating(false);
    }
  }

  function renderFilter(
    label: string,
    options: string[],
    value: string,
    onChange: (value: string) => void,
  ) {
    return (
      <View style={styles.filterGroup}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {options.map((option) => {
              const selected = value === option;

              return (
                <Pressable
                  key={option}
                  onPress={() => onChange(option)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected
                        ? colors.accent
                        : colors.backgroundElement,
                      borderColor: selected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: selected ? '#11100F' : colors.text,
                      },
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>
          ENCOUNTER SETUP
        </Text>

        <Text style={[styles.title, { color: colors.text }]}>Start Combat</Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Assemble both teams before entering the encounter.
        </Text>
      </View>

      <TextInput
        value={combatName}
        onChangeText={setCombatName}
        placeholder="Encounter name (optional)"
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.backgroundElement,
            borderColor: colors.border,
          },
        ]}
      />

      <View style={styles.teamRow}>
        <Pressable
          onPress={() => setTargetTeam('team1')}
          style={[
            styles.teamButton,
            {
              backgroundColor:
                targetTeam === 'team1' ? '#244A78' : colors.backgroundElement,
              borderColor: '#477DBA',
            },
          ]}
        >
          <Text style={styles.teamTitle}>Team 1</Text>
          <Text style={styles.teamCount}>{selectedTeam1.length} selected</Text>
        </Pressable>

        <Pressable
          onPress={() => setTargetTeam('team2')}
          style={[
            styles.teamButton,
            {
              backgroundColor:
                targetTeam === 'team2' ? '#87451F' : colors.backgroundElement,
              borderColor: '#D17A43',
            },
          ]}
        >
          <Text style={styles.teamTitle}>Team 2</Text>
          <Text style={styles.teamCount}>{selectedTeam2.length} selected</Text>
        </Pressable>
      </View>

      <Text style={[styles.helper, { color: colors.textSecondary }]}>
        Select a team, then tap characters below to add or remove them.
      </Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search characters..."
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.backgroundElement,
            borderColor: colors.border,
          },
        ]}
      />

      {renderFilter(
        'PARTY',
        ['All', 'Party', 'Not in Party'],
        partyFilter === 'all'
          ? 'All'
          : partyFilter === 'party'
            ? 'Party'
            : 'Not in Party',
        (value) =>
          setPartyFilter(
            value === 'Party'
              ? 'party'
              : value === 'Not in Party'
                ? 'non_party'
                : 'all',
          ),
      )}

      {renderFilter(
        'CATEGORY',
        CATEGORY_OPTIONS,
        categoryFilter,
        setCategoryFilter,
      )}

      {renderFilter('ENCOUNTER ROLE', ROLE_OPTIONS, roleFilter, setRoleFilter)}

      <View style={styles.crRow}>
        <View style={styles.crField}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
            Minimum CR
          </Text>
          <TextInput
            value={minCR}
            onChangeText={setMinCR}
            keyboardType="decimal-pad"
            placeholder="Any"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.backgroundElement,
                borderColor: colors.border,
              },
            ]}
          />
        </View>

        <View style={styles.crField}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
            Maximum CR
          </Text>
          <TextInput
            value={maxCR}
            onChangeText={setMaxCR}
            keyboardType="decimal-pad"
            placeholder="Any"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.backgroundElement,
                borderColor: colors.border,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.resultsHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Available Characters
        </Text>
        <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
          {filteredCharacters.length}
        </Text>
      </View>

      {loading ? (
        <View style={styles.status}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.helper, { color: colors.textSecondary }]}>
            Loading characters...
          </Text>
        </View>
      ) : error && characters.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>
            {error}
          </Text>
          <Pressable
            onPress={() => void refreshCharacters()}
            style={[styles.primaryButton, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : filteredCharacters.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: colors.backgroundElement,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No matching characters
          </Text>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>
            Try changing your filters or create characters first.
          </Text>
        </View>
      ) : (
        <View style={styles.characterList}>
          {filteredCharacters.map((character) => {
            const inTeam1 = selectedTeam1.includes(character.id);
            const inTeam2 = selectedTeam2.includes(character.id);
            const selected = inTeam1 || inTeam2;
            const selectedHere = targetTeam === 'team1' ? inTeam1 : inTeam2;

            const teamColor = inTeam1
              ? '#6BA8F0'
              : inTeam2
                ? '#F0A16B'
                : colors.border;

            return (
              <Pressable
                key={character.id}
                onPress={() => toggleCharacter(character.id)}
                style={[
                  styles.characterCard,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: selected ? teamColor : colors.border,
                    flexDirection: 'column',
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                  }}
                >
                  {/* Character portrait */}
                  <View
                    style={{
                      width: 56,
                      height: 84,
                      borderRadius: 8,
                      overflow: 'hidden',
                      backgroundColor:
                        colorScheme === 'dark' ? '#252C37' : '#E8DFD0',
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 8,
                        textAlign: 'center',
                      }}
                    >
                      NO PORTRAIT
                    </Text>
                  </View>

                  {/* Character information */}
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      style={[styles.characterName, { color: colors.text }]}
                    >
                      {character.name}
                    </Text>

                    <Text
                      style={[
                        styles.characterMeta,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {character.category || 'Uncategorized'}
                      {' · '}
                      {character.encounter_role || 'No role'}
                      {' · '}
                      {formatCR(character.challenge_rating)}
                    </Text>

                    <Text
                      style={[
                        styles.characterMeta,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {character.party === 1 ? 'Party member' : 'Not in party'}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.selectionBadge,
                    {
                      backgroundColor: selected ? teamColor : colors.background,
                      borderColor: teamColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.selectionText,
                      {
                        color: selected ? '#11100F' : colors.text,
                      },
                    ]}
                  >
                    {inTeam1 ? 'TEAM 1' : inTeam2 ? 'TEAM 2' : 'ADD'}
                  </Text>
                </View>

                {selected && !selectedHere && (
                  <Text
                    style={[styles.helper, { color: colors.textSecondary }]}
                  >
                    Already assigned to the other team
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {error && characters.length > 0 && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.backgroundElement,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Team Summary
        </Text>

        <Text style={[styles.summaryText, { color: '#6BA8F0' }]}>
          Team 1: {selectedTeam1.length} characters
        </Text>

        <Text style={[styles.summaryText, { color: '#F0A16B' }]}>
          Team 2: {selectedTeam2.length} characters
        </Text>
      </View>

      <Pressable
        onPress={() => void createCombat()}
        disabled={
          creating ||
          loading ||
          selectedTeam1.length === 0 ||
          selectedTeam2.length === 0
        }
        style={[
          styles.primaryButton,
          {
            backgroundColor: colors.accent,
            opacity:
              creating ||
              loading ||
              selectedTeam1.length === 0 ||
              selectedTeam2.length === 0
                ? 0.5
                : 1,
          },
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {creating ? 'Creating Combat...' : 'Start Encounter'}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.cancelButton}>
        <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
          Cancel
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.six,
  },
  header: {
    marginBottom: Spacing.four,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: Spacing.three,
  },
  teamRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.two,
  },
  teamButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 5,
  },
  teamTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  teamCount: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  helper: {
    fontSize: 13,
    lineHeight: 19,
  },
  filterGroup: {
    marginBottom: Spacing.three,
    gap: 8,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 5,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  crRow: {
    flexDirection: 'row',
    gap: 12,
  },
  crField: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  status: {
    padding: Spacing.four,
    alignItems: 'center',
    gap: 10,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.four,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  characterList: {
    gap: 10,
  },
  characterCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  characterInfo: {
    gap: 5,
  },
  characterName: {
    fontSize: 16,
    fontWeight: '700',
  },
  characterMeta: {
    fontSize: 12,
    lineHeight: 17,
  },
  selectionBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  selectionText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.four,
    marginTop: Spacing.four,
    marginBottom: Spacing.four,
    gap: 10,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#11100F',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
});

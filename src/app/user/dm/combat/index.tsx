import { useCampaign } from '@/campaigns/campaign-context';

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import { type CombatSummary, listCombats } from '@/api/combats';
import { Colors, Spacing } from '@/constants/theme';

export default function CombatIndexScreen() {
  const { campaign } = useCampaign();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const [combats, setCombats] = useState<CombatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeCombat = combats.find((combat) => combat.status === 'active');

  const historyCount = combats.filter(
    (combat) => combat.status === 'finished',
  ).length;

  const refreshCombats = useCallback(async () => {
    try {
      setError(null);

      const result = await listCombats(campaign!.id);
      setCombats(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred.',
      );
    } finally {
      setLoading(false);
    }
  }, [campaign]);

  useFocusEffect(
    useCallback(() => {
      void refreshCombats();
    }, [refreshCombats]),
  );

  function startOrResumeCombat() {
    if (activeCombat) {
      router.push({
        pathname: '/user/dm/combat/[id]',
        params: { id: activeCombat.id },
      });
      return;
    }

    router.push('/user/dm/combat/create');
  }

  function openCombat(combatId: string) {
    router.push({
      pathname: '/user/dm/combat/[id]',
      params: { id: combatId },
    });
  }

  function formatDate(value: string): string {
    const date = new Date(
      value.includes('Z') ? value : `${value.replace(' ', 'T')}Z`,
    );

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatOutcome(outcome: string | null): string {
    if (!outcome) return 'No outcome recorded';

    const labels: Record<string, string> = {
      team1_won: 'Team 1 won',
      team2_won: 'Team 2 won',
      team1_fled: 'Team 1 fled',
      team2_fled: 'Team 2 fled',
      draw: 'Draw',
      incomplete: 'Incomplete',
    };

    return labels[outcome] ?? outcome;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>
          ENCOUNTERS & ADVENTURES
        </Text>

        <Text style={[styles.title, { color: colors.text }]}>Combat</Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Prepare your teams, manage encounters, and revisit past battles.
        </Text>
      </View>

      <View style={styles.toolbar}>
        <Pressable
          onPress={startOrResumeCombat}
          style={[styles.primaryButton, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.primaryButtonText}>
            {activeCombat ? 'Resume Combat' : '+ Start Combat'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/user/dm/combat/history')}
          style={[
            styles.secondaryButton,
            {
              backgroundColor: colors.backgroundElement,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
            Combat History ({historyCount})
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.status}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Loading encounters...
          </Text>
        </View>
      ) : error ? (
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
            Could not load combats
          </Text>

          <Text
            style={[styles.emptyDescription, { color: colors.textSecondary }]}
          >
            {error}
          </Text>

          <Pressable
            onPress={() => void refreshCombats()}
            style={[styles.primaryButton, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {activeCombat ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Active Encounter
              </Text>

              <Pressable
                onPress={() => openCombat(activeCombat.id)}
                style={[
                  styles.combatCard,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.accent,
                  },
                ]}
              >
                <View style={styles.cardHeading}>
                  <View style={styles.combatNameContainer}>
                    <Text style={[styles.combatName, { color: colors.text }]}>
                      {activeCombat.name}
                    </Text>

                    <Text
                      style={[
                        styles.combatDate,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Started {formatDate(activeCombat.created_at)}
                    </Text>
                  </View>

                  <View
                    style={[styles.statusBadge, { borderColor: colors.accent }]}
                  >
                    <Text
                      style={[styles.statusBadgeText, { color: colors.accent }]}
                    >
                      ACTIVE
                    </Text>
                  </View>
                </View>

                <Text style={[styles.openHint, { color: colors.accent }]}>
                  Open encounter →
                </Text>
              </Pressable>
            </View>
          ) : (
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
                No active combat
              </Text>

              <Text
                style={[
                  styles.emptyDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Start an encounter and choose the characters for Team 1 and Team
                2. Your battle history will be saved automatically as the
                encounter progresses.
              </Text>

              <Pressable
                onPress={startOrResumeCombat}
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Text style={styles.primaryButtonText}>+ Start Combat</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.historyHeading}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Recent Battles
              </Text>

              <Pressable onPress={() => router.push('/user/dm/combat/history')}>
                <Text style={[styles.viewAll, { color: colors.accent }]}>
                  View all →
                </Text>
              </Pressable>
            </View>

            {combats.filter((combat) => combat.status === 'finished').length ===
            0 ? (
              <Text style={[styles.noHistory, { color: colors.textSecondary }]}>
                Completed encounters will appear here.
              </Text>
            ) : (
              <View style={styles.list}>
                {combats
                  .filter((combat) => combat.status === 'finished')
                  .slice(0, 3)
                  .map((combat) => (
                    <Pressable
                      key={combat.id}
                      onPress={() => openCombat(combat.id)}
                      style={[
                        styles.historyCard,
                        {
                          backgroundColor: colors.backgroundElement,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.cardHeading}>
                        <View style={styles.combatNameContainer}>
                          <Text
                            style={[styles.historyName, { color: colors.text }]}
                          >
                            {combat.name}
                          </Text>

                          <Text
                            style={[
                              styles.combatDate,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {formatDate(combat.updated_at)}
                          </Text>
                        </View>

                        <Text
                          style={[
                            styles.outcome,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {formatOutcome(combat.outcome)}
                        </Text>
                      </View>

                      <Text style={[styles.openHint, { color: colors.accent }]}>
                        View battle →
                      </Text>
                    </Pressable>
                  ))}
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Spacing.four,
    paddingTop: Spacing.four,
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
    marginTop: Spacing.two,
    lineHeight: 22,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.four,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#11100F',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  status: {
    padding: Spacing.five,
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    fontSize: 14,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.four,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  section: {
    marginTop: Spacing.four,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  combatCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.four,
    marginTop: Spacing.three,
  },
  historyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.four,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  combatNameContainer: {
    flex: 1,
    gap: 5,
  },
  combatName: {
    fontSize: 19,
    fontWeight: '700',
  },
  historyName: {
    fontSize: 16,
    fontWeight: '700',
  },
  combatDate: {
    fontSize: 12,
    lineHeight: 18,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  openHint: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: Spacing.three,
  },
  historyHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    gap: 10,
    marginTop: Spacing.three,
  },
  noHistory: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: Spacing.three,
  },
  outcome: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '42%',
  },
});

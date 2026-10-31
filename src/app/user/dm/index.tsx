import { useCampaign } from '@/campaigns/campaign-context';

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';

import { useDialog } from '@/components/dialog/realms-dialog';
import { Colors, Spacing } from '@/constants/theme';
import { listCharacters, loadCharacter, saveCharacter } from '@/api/characters';
import type { Character } from '@/models/character';

type PartyMember = {
  id: string;
  character: Character;
};

type HpAction = 'damage' | 'heal' | 'temporary';

export default function DMIndexScreen() {
  const { campaign, selectCharacter } = useCampaign();
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const { showInfo } = useDialog();

  const [members, setMembers] = useState<PartyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [actionTarget, setActionTarget] = useState<PartyMember | null>(null);
  const [action, setAction] = useState<HpAction | null>(null);
  const [amount, setAmount] = useState('');

  const loadParty = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!campaign) return;
      const [assigned, owned] = await Promise.all([
        listCharacters({ campaignId: campaign.id }),
        listCharacters(),
      ]);
      setOwnedIds(new Set(owned.map((item) => item.id)));
      const summaries = assigned.filter(
        (item) =>
          item.category.toLowerCase() === 'player character' ||
          item.party === 1,
      );

      const loadedMembers = await Promise.all(
        summaries.map(async (summary) => ({
          id: summary.id,
          character: await loadCharacter(summary.id),
        })),
      );

      setMembers(loadedMembers);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load party members.',
      );
    } finally {
      setLoading(false);
    }
  }, [campaign]);

  useFocusEffect(
    useCallback(() => {
      void loadParty();
    }, [loadParty]),
  );

  // Open the selected character on the main dashboard.
  const openDetails = async (id: string) => {
    if (openingId !== null || savingId !== null) return;

    setOpeningId(id);
    try {
      selectCharacter(id);
      router.push({ pathname: '/user/dm/character', params: { id } });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not open this character.',
      );
    } finally {
      setOpeningId(null);
    }
  };

  const openHpAction = (member: PartyMember, nextAction: HpAction) => {
    if (!ownedIds.has(member.id)) return;
    setActionTarget(member);
    setAction(nextAction);
    setAmount('');
  };

  const closeHpAction = () => {
    if (savingId !== null) return;

    setAction(null);
    setActionTarget(null);
    setAmount('');
  };

  const applyHpAction = async () => {
    if (!actionTarget || !action || savingId !== null) return;

    const value = Number(amount);

    if (amount.trim() === '' || !Number.isInteger(value) || value < 0) {
      showInfo('Invalid value', 'Enter a non-negative whole number.');
      return;
    }

    const targetId = actionTarget.id;
    const selectedAction = action;

    setSavingId(targetId);

    try {
      // Reload the latest saved character before applying the change.
      const updatedCharacter = await loadCharacter(targetId);

      if (selectedAction === 'damage') {
        updatedCharacter.takeDamage(value);
      } else if (selectedAction === 'heal') {
        updatedCharacter.heal(value);
      } else {
        updatedCharacter.setTemporaryHp(value);
      }

      await saveCharacter(updatedCharacter, targetId);

      setMembers((current) =>
        current.map((member) =>
          member.id === targetId
            ? { ...member, character: updatedCharacter }
            : member,
        ),
      );

      setAction(null);
      setActionTarget(null);
      setAmount('');
    } catch (err) {
      showInfo(
        'Update failed',
        err instanceof Error ? err.message : 'Could not update character.',
      );
    } finally {
      setSavingId(null);
    }
  };

  const getClasses = (character: Character) => {
    const classLevels = character.classLevels ?? [];

    if (classLevels.length === 0) {
      return character.characterClass || 'Class not set';
    }

    return classLevels
      .map(({ characterClass, subClass, level }) => {
        const name = subClass
          ? `${subClass} ${characterClass}`
          : characterClass;

        return `${name} ${level}`;
      })
      .join(' / ');
  };

  const getSpellSlots = (character: Character) =>
    Object.entries(character.spellSlots ?? {})
      .filter(([, slot]) => slot.maximum > 0)
      .sort(([a], [b]) => Number(a) - Number(b));

  const getResources = (character: Character) =>
    (character.resources ?? []).filter((resource) => resource.maximum > 0);

  const getDefenses = (character: Character) => [
    ...(character.damageResistances ?? []).map(
      (value) => `Resist: ${String(value)}`,
    ),
    ...(character.damageImmunities ?? []).map(
      (value) => `Immune: ${String(value)}`,
    ),
    ...(character.damageVulnerabilities ?? []).map(
      (value) => `Vulnerable: ${String(value)}`,
    ),
    ...(character.conditionImmunities ?? []).map(
      (value) => `Condition immune: ${String(value)}`,
    ),
  ];

  const getWeapons = (character: Character) => character.weapons ?? [];

  const actionTitle =
    action === 'damage'
      ? 'Take Damage'
      : action === 'heal'
        ? 'Heal Character'
        : 'Set Temporary HP';

  const actionDescription =
    action === 'damage'
      ? 'Enter the amount of damage.'
      : action === 'heal'
        ? 'Enter the amount of HP to restore.'
        : 'Enter the new temporary HP value.';

  const combatButtonStyle = (primary = false) => [
    styles.combatButton,
    {
      backgroundColor: primary ? colors.backgroundSelected : colors.background,
      borderColor: colors.border,
    },
  ];

  const renderCombatButton = (
    label: string,
    onPress: () => void,
    primary = false,
  ) => (
    <Pressable key={label} onPress={onPress} style={combatButtonStyle(primary)}>
      <Text style={[styles.combatButtonText, { color: colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>
            DUNGEON MASTER
          </Text>

          <Text style={[styles.title, { color: colors.text }]}>Party</Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Party members, combat readiness, and character resources.
          </Text>
        </View>

        {loading ? (
          <View style={styles.status}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={[styles.muted, { color: colors.textSecondary }]}>
              Loading party members...
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
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Could not load party
            </Text>

            <Text style={[styles.muted, { color: colors.textSecondary }]}>
              {error}
            </Text>

            <Pressable
              onPress={() => void loadParty()}
              style={[styles.primaryButton, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.primaryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : members.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              No party members yet
            </Text>

            <Text style={[styles.muted, { color: colors.textSecondary }]}>
              Mark characters as part of the party in their character data to
              have them appear here.
            </Text>

            <Pressable
              onPress={() => router.push('/user/dm/characters')}
              style={[styles.primaryButton, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.primaryButtonText}>View Characters</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.grid}>
            {members.map(({ id, character }) => {
              const slots = getSpellSlots(character);
              const resources = getResources(character);
              const defenses = getDefenses(character);
              const feats = character.feats ?? [];
              const isSaving = savingId === id;
              const weapons = getWeapons(character);
              return (
                <View
                  key={id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.backgroundElement,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {/* Character identity */}
                  <View style={styles.identity}>
                    {character.portraitPath ? (
                      <Image
                        source={{
                          uri: character.portraitPath,
                        }}
                        style={styles.portrait}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.portraitPlaceholder,
                          {
                            backgroundColor: colors.backgroundSelected,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.portraitInitial,
                            {
                              color: colors.textSecondary,
                            },
                          ]}
                        >
                          {(character.name || '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <View style={styles.identityText}>
                      <Text
                        numberOfLines={2}
                        style={[styles.name, { color: colors.text }]}
                      >
                        {character.name || 'Unnamed Character'}
                      </Text>

                      <Text
                        numberOfLines={2}
                        style={[
                          styles.classes,
                          {
                            color: colors.textSecondary,
                          },
                        ]}
                      >
                        {getClasses(character)}
                      </Text>

                      <Text
                        style={[
                          styles.species,
                          {
                            color: colors.textSecondary,
                          },
                        ]}
                      >
                        {character.species || 'Species not set'}
                      </Text>
                    </View>
                  </View>

                  {/* Combat statistics */}
                  <View style={styles.statsGrid}>
                    {[
                      {
                        label: 'HP',
                        value: `${character.currentHp}/${character.maxHp}`,
                      },
                      {
                        label: 'Temp HP',
                        value: String(character.temporaryHp),
                      },
                      {
                        label: 'AC',
                        value: String(character.armorClass),
                      },
                      {
                        label: 'Initiative',
                        value: formatModifier(character.initiative),
                      },
                      {
                        label: 'Speed',
                        value: `${character.totalSpeed} ft.`,
                      },
                    ].map((stat) => (
                      <View
                        key={stat.label}
                        style={[
                          styles.statCell,
                          {
                            backgroundColor: colors.background,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statLabel,
                            {
                              color: colors.textSecondary,
                            },
                          ]}
                        >
                          {stat.label}
                        </Text>

                        <Text
                          numberOfLines={1}
                          style={[styles.statValue, { color: colors.text }]}
                        >
                          {stat.value}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Damage, healing, and temporary HP */}
                  {!ownedIds.has(id) && (
                    <Text style={{ color: colors.textSecondary }}>
                      Read-only player character
                    </Text>
                  )}
                  {ownedIds.has(id) && (
                    <View style={styles.combatActions}>
                      {renderCombatButton('− Damage', () =>
                        openHpAction({ id, character }, 'damage'),
                      )}

                      {renderCombatButton(
                        '+ Heal',
                        () => openHpAction({ id, character }, 'heal'),
                        true,
                      )}

                      {renderCombatButton('Temp HP', () =>
                        openHpAction({ id, character }, 'temporary'),
                      )}
                    </View>
                  )}

                  <CompactSection
                    title="Spell Slots"
                    emptyText="No spell slots"
                    color={colors.text}
                    mutedColor={colors.textSecondary}
                  >
                    {slots.length > 0 ? (
                      <View style={styles.chipRow}>
                        {slots.map(([level, slot]) => (
                          <View
                            key={level}
                            style={[
                              styles.chip,
                              {
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <Text
                              style={[styles.chipText, { color: colors.text }]}
                            >
                              L{level}: {slot.current}/{slot.maximum}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </CompactSection>

                  <CompactSection
                    title="Resources"
                    emptyText="No tracked resources"
                    color={colors.text}
                    mutedColor={colors.textSecondary}
                  >
                    {resources.length > 0 ? (
                      <View style={styles.chipRow}>
                        {resources.map((resource, index) => (
                          <View
                            key={`${resource.name}-${index}`}
                            style={[
                              styles.chip,
                              {
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.chipText,
                                {
                                  color: colors.text,
                                },
                              ]}
                            >
                              {resource.name}: {resource.current}/
                              {resource.maximum}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </CompactSection>

                  <CompactSection
                    title="Feats"
                    emptyText="No feats recorded"
                    color={colors.text}
                    mutedColor={colors.textSecondary}
                  >
                    {feats.length > 0 ? (
                      <Text
                        numberOfLines={3}
                        style={[
                          styles.detailText,
                          {
                            color: colors.textSecondary,
                          },
                        ]}
                      >
                        {feats.join(', ')}
                      </Text>
                    ) : null}
                  </CompactSection>

                  <CompactSection
                    title="Defenses"
                    emptyText="No special defenses"
                    color={colors.text}
                    mutedColor={colors.textSecondary}
                  >
                    {defenses.length > 0 ? (
                      <Text
                        numberOfLines={3}
                        style={[
                          styles.detailText,
                          {
                            color: colors.textSecondary,
                          },
                        ]}
                      >
                        {defenses.join(' · ')}
                      </Text>
                    ) : null}
                  </CompactSection>
                  <CompactSection
                    title="Weapons"
                    emptyText="No weapons configured"
                    color={colors.text}
                    mutedColor={colors.textSecondary}
                  >
                    {weapons.length > 0 ? (
                      <View style={{ gap: 6 }}>
                        {weapons.map((weapon) => {
                          const attackBonus = weapon.getAttackBonus(character);
                          const damageBonus = weapon.getDamageBonus(character);

                          const damageFormula = weapon.isUnarmed
                            ? `${Math.max(1, Number(weapon.damageDice) + damageBonus)}`
                            : `${weapon.damageDice}${
                                damageBonus !== 0
                                  ? ` ${damageBonus > 0 ? '+' : '−'} ${Math.abs(damageBonus)}`
                                  : ''
                              }`;

                          const properties = [
                            weapon.isFinesse ? 'Finesse' : null,
                            weapon.isThrown ? 'Thrown' : null,
                            weapon.isBound ? 'Bound' : null,
                            weapon.isUnarmed ? 'Unarmed' : null,
                          ].filter(Boolean);

                          return (
                            <View
                              key={weapon.id}
                              style={[
                                styles.weaponItem,
                                {
                                  backgroundColor: colors.background,
                                  borderColor: colors.border,
                                },
                              ]}
                            >
                              <Text
                                numberOfLines={1}
                                style={[
                                  styles.resourceName,
                                  { color: colors.text },
                                ]}
                              >
                                {weapon.name}
                              </Text>

                              <View style={styles.weaponStats}>
                                <Text
                                  style={[
                                    styles.weaponStat,
                                    { color: colors.text },
                                  ]}
                                >
                                  ATK {attackBonus >= 0 ? '+' : ''}
                                  {attackBonus}
                                </Text>

                                <Text
                                  style={[
                                    styles.weaponStat,
                                    { color: colors.text },
                                  ]}
                                >
                                  {damageFormula}
                                </Text>
                              </View>

                              <Text
                                style={[
                                  styles.mutedSmall,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {weapon.damageType}
                                {properties.length > 0
                                  ? ` · ${properties.join(' · ')}`
                                  : ''}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : null}
                  </CompactSection>
                  {/* Opens the main dashboard for this character */}
                  <Pressable
                    onPress={() => void openDetails(id)}
                    disabled={openingId !== null || savingId !== null}
                    style={[
                      styles.detailsButton,
                      { backgroundColor: colors.accent },
                      (openingId !== null || savingId !== null) &&
                        styles.disabled,
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>
                      {openingId === id ? 'Opening...' : 'Details →'}
                    </Text>
                  </Pressable>

                  {isSaving ? (
                    <Text
                      style={[
                        styles.savingText,
                        {
                          color: colors.textSecondary,
                        },
                      ]}
                    >
                      Saving changes...
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Shared modal for damage, healing, and temporary HP */}
      <Modal
        visible={action !== null && actionTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={closeHpAction}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {actionTitle}
            </Text>

            <Text
              style={[styles.modalDescription, { color: colors.textSecondary }]}
            >
              {actionTarget?.character.name || 'Character'}
              {' · '}
              {actionDescription}
            </Text>

            <TextInput
              value={amount}
              onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="Amount"
              placeholderTextColor={colors.textSecondary}
              editable={savingId === null}
              autoFocus
              style={[
                styles.amountInput,
                {
                  color: colors.text,
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.border,
                },
              ]}
            />

            <View style={styles.modalActions}>
              <Pressable
                disabled={savingId !== null}
                onPress={closeHpAction}
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.border,
                  },
                  savingId !== null && styles.disabled,
                ]}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                disabled={savingId !== null}
                onPress={() => void applyHpAction()}
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.accent },
                  savingId !== null && styles.disabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {savingId !== null ? 'Saving…' : 'Apply'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function CompactSection({
  title,
  emptyText,
  color,
  mutedColor,
  children,
}: {
  title: string;
  emptyText: string;
  color: string;
  mutedColor: string;
  children: React.ReactNode;
}) {
  const isEmpty = !children;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>

      {isEmpty ? (
        <Text style={[styles.mutedSmall, { color: mutedColor }]}>
          {emptyText}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

function formatModifier(value: number) {
  return value >= 0 ? `+${value}` : String(value);
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: 100,
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
    fontSize: 14,
    lineHeight: 21,
    marginTop: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 10,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  portrait: {
    width: 54,
    height: 62,
    borderRadius: 8,
    backgroundColor: '#292929',
  },
  portraitPlaceholder: {
    width: 54,
    height: 62,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitInitial: {
    fontSize: 24,
    fontWeight: '700',
  },
  identityText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
  },
  classes: {
    fontSize: 11,
    lineHeight: 15,
  },
  species: {
    fontSize: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  statCell: {
    width: '48%',
    flexGrow: 1,
    padding: 6,
    borderRadius: 7,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  combatActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  combatButton: {
    flex: 1,
    minWidth: 70,
    minHeight: 36,
    paddingHorizontal: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  combatButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  section: {
    gap: 5,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  chip: {
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  detailText: {
    fontSize: 10,
    lineHeight: 14,
  },
  muted: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  mutedSmall: {
    fontSize: 10,
    lineHeight: 14,
  },
  status: {
    padding: Spacing.five,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryButton: {
    borderRadius: 9,
    paddingVertical: 11,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#11100F',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  detailsButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  savingText: {
    fontSize: 10,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    padding: 20,
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  modalDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  amountInput: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  weaponItem: {
    padding: 7,
    borderWidth: 1,
    borderRadius: 7,
    gap: 4,
  },
  weaponStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 4,
  },
  weaponStat: {
    fontSize: 10,
    fontWeight: '800',
  },
  resourceName: {
    fontSize: 11,
    fontWeight: '800',
  },
});

import {
  CharacterPressable as Pressable,
  CharacterTextInput as TextInput,
} from './character-access';
import { Colors } from '@/constants/theme';
import { Character } from '@/models/character';
import { SpellSlot } from '@/models/spell-slot';
import { useDialog } from '@/components/dialog/realms-dialog';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import { Modal, ScrollView, Text, useColorScheme, View } from 'react-native';

type SpellSlotsCardProps = {
  character: Character;
  onUpdate: (character: Character) => Promise<void>;
};

type SlotDraft = {
  level: number;
  maximum: string;
  current: string;
};

export default function SpellSlotsCard({
  character,
  onUpdate,
}: SpellSlotsCardProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { showInfo } = useDialog();

  const [editVisible, setEditVisible] = useState(false);
  const [recoverVisible, setRecoverVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [slotDrafts, setSlotDrafts] = useState<SlotDraft[]>([]);
  const [recoverLevel, setRecoverLevel] = useState<number | null>(null);
  const [recoverAmount, setRecoverAmount] = useState('1');
  const [recoverReason, setRecoverReason] = useState('');

  const slots = Object.values(character.spellSlots)
    .filter((slot) => slot.maximum > 0)
    .sort((a, b) => a.level - b.level);

  const makeUpdatedCharacter = (): Character =>
    Object.assign(Object.create(Object.getPrototypeOf(character)), character, {
      spellSlots: Object.fromEntries(
        Object.entries(character.spellSlots).map(([level, slot]) => [
          level,
          new SpellSlot(slot.level, slot.maximum, slot.current),
        ]),
      ),
      logs: [...character.logs],
    }) as Character;

  const openEditSlots = () => {
    if (saving) return;

    setSlotDrafts(
      Array.from({ length: 9 }, (_, index) => {
        const level = index + 1;
        const slot = character.spellSlots[level];

        return {
          level,
          maximum: String(slot?.maximum ?? 0),
          current: String(slot?.current ?? 0),
        };
      }),
    );

    setEditVisible(true);
  };

  const updateDraft = (
    level: number,
    field: 'maximum' | 'current',
    value: string,
  ) => {
    if (value !== '' && !/^\d+$/.test(value)) return;

    setSlotDrafts((previous) =>
      previous.map((draft) =>
        draft.level === level ? { ...draft, [field]: value } : draft,
      ),
    );
  };

  const saveSlots = async () => {
    if (saving) return;

    const parsed = slotDrafts.map((draft) => ({
      level: draft.level,
      maximum: Number(draft.maximum),
      current: Number(draft.current),
    }));

    const invalid = parsed.find(
      (slot) =>
        slot.maximum < 0 ||
        slot.current < 0 ||
        slot.current > slot.maximum ||
        !Number.isInteger(slot.maximum) ||
        !Number.isInteger(slot.current),
    );

    if (invalid) {
      showInfo(
        'Invalid Spell Slots',
        `Level ${invalid.level}: current slots must be between 0 and the maximum.`,
      );
      return;
    }

    try {
      setSaving(true);

      const updatedCharacter = makeUpdatedCharacter();

      for (const slot of parsed) {
        updatedCharacter.setSpellSlots(slot.level, slot.maximum, slot.current);
      }

      updatedCharacter.logs.push('Updated spell slot configuration.');

      await onUpdate(updatedCharacter);
      setEditVisible(false);
    } catch (error) {
      showInfo(
        'Could Not Save',
        error instanceof Error
          ? error.message
          : 'Failed to update spell slots.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUseSpellSlot = async (level: number) => {
    if (saving) return;

    const slot = character.spellSlots[level];

    if (!slot || slot.current <= 0) return;

    try {
      setSaving(true);

      const updatedCharacter = makeUpdatedCharacter();
      const updatedSlot = updatedCharacter.getSpellSlots(level);

      updatedSlot.use();

      updatedCharacter.logs.push(
        `Used one Level ${level} spell slot. Remaining: ${updatedSlot.current}/${updatedSlot.maximum}.`,
      );

      await onUpdate(updatedCharacter);
    } catch (error) {
      showInfo(
        'Could Not Use Spell Slot',
        error instanceof Error ? error.message : 'Failed to use spell slot.',
      );
    } finally {
      setSaving(false);
    }
  };

  const openRecoverSlots = () => {
    if (saving) return;

    const recoverable = slots.filter((slot) => slot.current < slot.maximum);

    if (recoverable.length === 0) {
      showInfo(
        'Recover Spell Slots',
        'All configured spell slots are already available.',
      );
      return;
    }

    setRecoverLevel(recoverable[0].level);
    setRecoverAmount('1');
    setRecoverReason('');
    setRecoverVisible(true);
  };

  const recoverableSlots = slots.filter((slot) => slot.current < slot.maximum);

  const selectedSlot =
    recoverLevel === null ? undefined : character.spellSlots[recoverLevel];

  const remainingToRecover = selectedSlot
    ? selectedSlot.maximum - selectedSlot.current
    : 0;

  const saveRecovery = async () => {
    if (saving) return;

    const amount = Number(recoverAmount);
    const reason = recoverReason.trim();

    if (
      recoverLevel === null ||
      !Number.isInteger(amount) ||
      amount <= 0 ||
      !reason
    ) {
      showInfo(
        'Invalid Recovery',
        'Select a level, enter a valid amount, and provide a reason.',
      );
      return;
    }

    if (amount > remainingToRecover) {
      showInfo(
        'Invalid Amount',
        `You can recover at most ${remainingToRecover} slot(s) at this level.`,
      );
      return;
    }

    try {
      setSaving(true);

      const updatedCharacter = makeUpdatedCharacter();
      const slot = updatedCharacter.getSpellSlots(recoverLevel);

      slot.restore(amount);

      updatedCharacter.logs.push(
        `Recovered ${amount} Level ${recoverLevel} spell slot(s). Reason: ${reason}`,
      );

      await onUpdate(updatedCharacter);
      setRecoverVisible(false);
    } catch (error) {
      showInfo(
        'Could Not Recover Slots',
        error instanceof Error
          ? error.message
          : 'Failed to recover spell slots.',
      );
    } finally {
      setSaving(false);
    }
  };

  const buttonStyle = {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSelected,
  };

  const buttonTextStyle = {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700' as const,
  };

  const inputStyle = {
    color: colors.text,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
  };

  const modalStyle = {
    width: '100%' as const,
    maxWidth: 600,
    minWidth: 300,
    maxHeight: '90%' as const,
    padding: 20,
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  };

  const modalTitleStyle = {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800' as const,
  };

  const labelStyle = {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  };

  const renderModalButton = (
    label: string,
    onPress: () => void,
    disabled = false,
  ) => (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        buttonStyle,
        {
          backgroundColor: colors.accent,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Text
        style={{
          ...buttonTextStyle,
          color: scheme === 'dark' ? '#11100F' : '#FFFFFF',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <>
      <BlurView
        intensity={scheme === 'dark' ? 35 : 55}
        tint={scheme === 'dark' ? 'dark' : 'light'}
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View style={{ padding: 18, gap: 16 }}>
          <Text
            style={{
              color: colors.accent,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 2,
            }}
          >
            SPELL SLOTS
          </Text>

          {slots.length === 0 ? (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
              }}
            >
              No spell slots available.
            </Text>
          ) : (
            <View style={{ gap: 14 }}>
              {slots.map((slot) => (
                <View key={slot.level} style={{ gap: 8 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <View style={{ gap: 3 }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 13,
                          fontWeight: '700',
                        }}
                      >
                        LEVEL {slot.level}
                      </Text>

                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 12,
                        }}
                      >
                        {slot.current}/{slot.maximum} remaining
                      </Text>
                    </View>

                    <Pressable
                      disabled={saving || slot.current === 0}
                      onPress={() => void handleUseSpellSlot(slot.level)}
                      style={[
                        buttonStyle,
                        {
                          paddingVertical: 6,
                          opacity: saving || slot.current === 0 ? 0.45 : 1,
                        },
                      ]}
                    >
                      <Text style={buttonTextStyle}>Use</Text>
                    </Pressable>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    {Array.from({ length: slot.maximum }, (_, index) => (
                      <View
                        key={index}
                        style={{
                          width: 17,
                          height: 17,
                          borderRadius: 9,
                          borderWidth: 1,
                          borderColor: colors.accent,
                          backgroundColor:
                            index < slot.current
                              ? colors.accent
                              : 'transparent',
                        }}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
            }}
          />

          <View style={{ gap: 8 }}>
            <Pressable
              disabled={saving}
              onPress={openEditSlots}
              style={[buttonStyle, { opacity: saving ? 0.5 : 1 }]}
            >
              <Text style={buttonTextStyle}>+ Edit Spell Slots</Text>
            </Pressable>

            <Pressable
              disabled={saving}
              onPress={openRecoverSlots}
              style={[buttonStyle, { opacity: saving ? 0.5 : 1 }]}
            >
              <Text style={buttonTextStyle}>Recover Spell Slots</Text>
            </Pressable>
          </View>
        </View>
      </BlurView>

      {/* Edit Spell Slots */}
      <Modal
        visible={editVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!saving) setEditVisible(false);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View style={modalStyle}>
            <Text style={modalTitleStyle}>Edit Spell Slots</Text>

            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
              }}
            >
              Set the maximum and remaining slots for each level. Set maximum to
              0 to disable a level.
            </Text>

            <ScrollView
              style={{ flexGrow: 0, maxHeight: 430 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ gap: 12 }}>
                {slotDrafts.map((draft) => (
                  <View
                    key={draft.level}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 13,
                        fontWeight: '600',
                        width: 65,
                      }}
                    >
                      Level {draft.level}
                    </Text>

                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={labelStyle}>Current</Text>

                      <TextInput
                        value={draft.current}
                        onChangeText={(value) =>
                          updateDraft(draft.level, 'current', value)
                        }
                        editable={!saving}
                        keyboardType="number-pad"
                        selectTextOnFocus
                        style={inputStyle}
                      />
                    </View>

                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={labelStyle}>Maximum</Text>

                      <TextInput
                        value={draft.maximum}
                        onChangeText={(value) =>
                          updateDraft(draft.level, 'maximum', value)
                        }
                        editable={!saving}
                        keyboardType="number-pad"
                        selectTextOnFocus
                        style={inputStyle}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View
              style={{
                flexDirection: 'row',
                gap: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                {renderModalButton(
                  'Cancel',
                  () => setEditVisible(false),
                  saving,
                )}
              </View>

              <View style={{ flex: 1 }}>
                {renderModalButton(
                  saving ? 'Saving...' : 'Save Slots',
                  () => void saveSlots(),
                  saving,
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Recover Spell Slots */}
      <Modal
        visible={recoverVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!saving) setRecoverVisible(false);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View style={modalStyle}>
            <Text style={modalTitleStyle}>Recover Spell Slots</Text>

            <Text style={labelStyle}>SPELL SLOT LEVEL</Text>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {recoverableSlots.map((slot) => {
                const selected = recoverLevel === slot.level;

                return (
                  <Pressable
                    key={slot.level}
                    disabled={saving}
                    onPress={() => {
                      setRecoverLevel(slot.level);
                      setRecoverAmount('1');
                    }}
                    style={[
                      buttonStyle,
                      {
                        minWidth: 66,
                        backgroundColor: selected
                          ? colors.accent
                          : colors.backgroundElement,
                        opacity: saving ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        ...buttonTextStyle,
                        color: selected
                          ? scheme === 'dark'
                            ? '#11100F'
                            : '#FFFFFF'
                          : colors.text,
                      }}
                    >
                      Level {slot.level}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ gap: 6 }}>
              <Text style={labelStyle}>
                NUMBER TO RECOVER (MAX {remainingToRecover})
              </Text>

              <TextInput
                value={recoverAmount}
                onChangeText={(value) => {
                  if (/^\d*$/.test(value)) {
                    setRecoverAmount(value);
                  }
                }}
                editable={!saving}
                keyboardType="number-pad"
                selectTextOnFocus
                style={inputStyle}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={labelStyle}>REASON</Text>

              <TextInput
                value={recoverReason}
                onChangeText={setRecoverReason}
                editable={!saving}
                placeholder="e.g. Arcane Recovery"
                placeholderTextColor={colors.textSecondary}
                style={inputStyle}
              />
            </View>

            <View
              style={{
                flexDirection: 'row',
                gap: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                {renderModalButton(
                  'Cancel',
                  () => setRecoverVisible(false),
                  saving,
                )}
              </View>

              <View style={{ flex: 1 }}>
                {renderModalButton(
                  saving ? 'Recovering...' : 'Recover',
                  () => void saveRecovery(),
                  saving,
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

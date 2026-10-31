import {
  CharacterPressable as Pressable,
  CharacterTextInput as TextInput,
} from './character-access';
import { Colors } from '@/constants/theme';
import { useDialog } from '@/components/dialog/realms-dialog';
import type { Character } from '@/models/character';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import { Text, useColorScheme, View } from 'react-native';

type NotesCardProps = {
  character: Character;
  onUpdate: (character: Character) => Promise<void>;
};

export default function NotesCard({ character, onUpdate }: NotesCardProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { showInfo } = useDialog();

  const [draft, setDraft] = useState({ source: character.notes, text: character.notes });
  const notes = draft.source === character.notes ? draft.text : character.notes;
  const setNotes = (text: string) => setDraft({ source: character.notes, text });
  const [saving, setSaving] = useState(false);


  const hasChanges = notes !== character.notes;

  async function saveNotes() {
    if (saving || !hasChanges) return;

    setSaving(true);

    try {
      const updatedCharacter = Object.assign(
        Object.create(Object.getPrototypeOf(character)),
        character,
        { notes },
      ) as Character;

      await onUpdate(updatedCharacter);
    } catch (error) {
      showInfo(
        'Save failed',
        error instanceof Error ? error.message : 'Could not save your notes.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <BlurView
      intensity={scheme === 'dark' ? 35 : 65}
      tint={scheme === 'dark' ? 'dark' : 'light'}
      style={{
        padding: 16,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
        marginTop: 16,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 16,
            fontWeight: '700',
            letterSpacing: 0.5,
          }}
        >
          NOTES
        </Text>

        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 12,
          }}
        >
          {notes.length} characters
        </Text>
      </View>

      <View
        style={{
          backgroundColor: colors.backgroundElement,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: 12,
        }}
      >
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Write your character's story, reminders, plans..."
          placeholderTextColor={colors.textSecondary}
          multiline
          textAlignVertical="top"
          style={{
            minHeight: 160,
            color: colors.text,
            fontSize: 14,
            lineHeight: 22,
            padding: 0,
          }}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          onPress={() => void saveNotes()}
          disabled={saving || !hasChanges}
          style={{
            backgroundColor: colors.accent,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 9,
            opacity: saving || !hasChanges ? 0.5 : 1,
          }}
        >
          <Text
            style={{
              color: scheme === 'dark' ? '#11100F' : '#FFFFFF',
              fontSize: 13,
              fontWeight: '700',
            }}
          >
            {saving ? 'Saving...' : 'Save Notes'}
          </Text>
        </Pressable>
      </View>
    </BlurView>
  );
}

import { CharacterReadOnlyContext } from './character-access';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View, useColorScheme } from 'react-native';

import {
  saveCharacter as persistCharacter,
  loadCharacter,
} from '@/api/characters';
import { useDialog } from '@/components/dialog/realms-dialog';
import { Colors } from '@/constants/theme';
import { loadActiveCharacter } from '@/database/active-character';
import { Character } from '@/models/character';

import AbilityScores from './ability-scores';
import BonusManager, { type BonusOption } from './bonus-manager';
import ClassActions from './class-actions';
import CombatStats from './combat-stats';
import Defenses from './defenses';
import Equipment from './equipment';
import HeroSection from './hero-section';
import CharacterLogCard from './logs-card';
import NotesCard from './notes-card';
import Proficiencies from './proficiencies';
import SavingThrows from './saving-throws';
import Skills from './skills';
import SpellbookCard from './spell-book';
import SpellColumn from './spell-column';

import type { Ability } from '@/models/character';
import type { BonusCategory, CombatStat, Skill } from '@/rules/dnd5e-2024';
import type { DashboardSection } from './sidebar';
import WeaponCards from './weapon-cards';

type DashboardProps = {
  characterId?: string;
  readOnly?: boolean;
  onSectionLayout?: (section: DashboardSection, y: number) => void;
};

export default function Dashboard({
  onSectionLayout,
  characterId,
  readOnly = false,
}: DashboardProps) {
  const saveCharacter = useCallback(
    async (value: Character) => {
      if (readOnly) throw new Error('Only the owner can edit this character.');
      await persistCharacter(value);
    },
    [readOnly],
  );
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { showInfo, showConfirm } = useDialog();

  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  type BonusTarget = {
    stat: string;
    title: string;
    categories: BonusOption[];
    initialCategory: BonusCategory | null;
  };

  const [bonusTarget, setBonusTarget] = useState<BonusTarget | null>(null);

  const openBonusManager = useCallback(
    (
      stat: string,
      title: string,
      categories: BonusOption[],
      initialCategory: BonusCategory | null,
    ) => {
      setBonusTarget({
        stat,
        title,
        categories,
        initialCategory,
      });
    },
    [],
  );

  const handleAddAbilityBonus = useCallback(
    (
      ability: Ability,
      category: 'ability_score' | 'ability_check' | 'saving_throw',
    ) => {
      const options: BonusOption[] = [
        { label: 'Ability Score', category: 'ability_score' },
        { label: 'Ability Check', category: 'ability_check' },
        { label: 'Saving Throw', category: 'saving_throw' },
      ];

      openBonusManager(ability, ability.toUpperCase(), options, category);
    },
    [openBonusManager],
  );

  const handleAddSavingThrowBonus = useCallback(
    (ability: Ability, category: 'saving_throw') => {
      openBonusManager(
        ability,
        `${ability.toUpperCase()} Saving Throw`,
        [{ label: 'Saving Throw', category }],
        category,
      );
    },
    [openBonusManager],
  );

  const handleAddSkillBonus = useCallback(
    (skill: Skill, displayName: string) => {
      openBonusManager(
        skill,
        `${displayName} Bonus`,
        [{ label: 'Skill', category: 'skill' }],
        'skill',
      );
    },
    [openBonusManager],
  );

  const handleAddCombatBonus = useCallback(
    (stat: CombatStat, title: string) => {
      openBonusManager(stat, title, [{ label: 'Bonus', category: null }], null);
    },
    [openBonusManager],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadCharacterFromDatabase() {
        setLoading(true);
        setError(null);

        try {
          const loadedCharacter = characterId
            ? await loadCharacter(characterId)
            : await loadActiveCharacter();

          if (active) {
            setCharacter(loadedCharacter);
          }
        } catch (err) {
          if (active) {
            setError(
              err instanceof Error
                ? err.message
                : 'Failed to load character from database.',
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      void loadCharacterFromDatabase();

      return () => {
        active = false;
      };
    }, [characterId]),
  );

  const handleChangeText = useCallback(
    async (field: 'ideals' | 'bonds' | 'flaws', value: string) => {
      if (!character) return;

      const updatedCharacter = Object.assign(
        Object.create(Object.getPrototypeOf(character)),
        character,
        { [field]: value },
      ) as Character;

      setCharacter(updatedCharacter);

      try {
        await saveCharacter(updatedCharacter);
        setError(null);
      } catch (err) {
        setCharacter(character);
        showInfo(
          'Could not save changes',
          err instanceof Error ? err.message : 'Failed to save character.',
        );
      }
    },
    [character, showInfo, saveCharacter],
  );

  const handleCombatUpdate = useCallback(
    async (updatedCharacter: Character) => {
      await saveCharacter(updatedCharacter);
      setCharacter(updatedCharacter);
      setError(null);
    },
    [saveCharacter],
  );

  const handleAddTrait = useCallback(
    async (trait: string) => {
      if (!character) return;

      const updatedCharacter = Object.assign(
        Object.create(Object.getPrototypeOf(character)),
        character,
        { traits: [...(character.traits ?? [])] },
      ) as Character;

      try {
        updatedCharacter.addTrait(trait);

        await saveCharacter(updatedCharacter);
        setCharacter(updatedCharacter);
        setError(null);
      } catch (err) {
        showInfo(
          'Could not add trait',
          err instanceof Error ? err.message : 'Failed to save the trait.',
        );
      }
    },
    [character, showInfo, saveCharacter],
  );

  const handleRemoveTrait = useCallback(
    (trait: string) => {
      if (!character) return;

      showConfirm({
        title: 'Remove Trait',
        message: `Are you sure you want to remove "${trait}"?`,
        confirmLabel: 'Remove',
        cancelLabel: 'Cancel',
        destructive: true,
        onConfirm: async () => {
          const updatedCharacter = Object.assign(
            Object.create(Object.getPrototypeOf(character)),
            character,
            { traits: [...(character.traits ?? [])] },
          ) as Character;

          try {
            updatedCharacter.removeTrait(trait);

            await saveCharacter(updatedCharacter);
            setCharacter(updatedCharacter);
            setError(null);
          } catch (err) {
            showInfo(
              'Could not remove trait',
              err instanceof Error ? err.message : 'Failed to save the change.',
            );
          }
        },
      });
    },
    [character, showConfirm, showInfo],
  );

  const handleAddCondition = useCallback(
    async (condition: string) => {
      if (!character) return;

      const updatedCharacter = Object.assign(
        Object.create(Object.getPrototypeOf(character)),
        character,
        { conditions: [...(character.conditions ?? [])] },
      ) as Character;

      try {
        updatedCharacter.addCondition(condition);

        await saveCharacter(updatedCharacter);
        setCharacter(updatedCharacter);
        setError(null);
      } catch (err) {
        showInfo(
          'Could not add condition',
          err instanceof Error ? err.message : 'Failed to save the condition.',
        );
      }
    },
    [character, showInfo, saveCharacter],
  );

  const handleRemoveCondition = useCallback(
    (condition: string) => {
      if (!character) return;

      showConfirm({
        title: 'Remove Condition',
        message: `Are you sure you want to remove "${condition}"?`,
        confirmLabel: 'Remove',
        cancelLabel: 'Cancel',
        destructive: true,
        onConfirm: async () => {
          const updatedCharacter = Object.assign(
            Object.create(Object.getPrototypeOf(character)),
            character,
            { conditions: [...(character.conditions ?? [])] },
          ) as Character;

          try {
            updatedCharacter.removeCondition(condition);

            await saveCharacter(updatedCharacter);
            setCharacter(updatedCharacter);
            setError(null);
          } catch (err) {
            showInfo(
              'Could not remove condition',
              err instanceof Error ? err.message : 'Failed to save the change.',
            );
          }
        },
      });
    },
    [character, showConfirm, showInfo],
  );

  const handleAddFeat = useCallback(
    async (feat: string) => {
      if (!character) return;

      const updatedCharacter = Object.assign(
        Object.create(Object.getPrototypeOf(character)),
        character,
        { feats: [...(character.feats ?? [])] },
      ) as Character;

      try {
        updatedCharacter.addFeat(feat);

        await saveCharacter(updatedCharacter);
        setCharacter(updatedCharacter);
        setError(null);
      } catch (err) {
        showInfo(
          'Could not add feat',
          err instanceof Error ? err.message : 'Failed to save the feat.',
        );
      }
    },
    [character, showInfo, saveCharacter],
  );

  const handleRemoveFeat = useCallback(
    (feat: string) => {
      if (!character) return;

      showConfirm({
        title: 'Remove Feat',
        message: `Are you sure you want to remove "${feat}"?`,
        confirmLabel: 'Remove',
        cancelLabel: 'Cancel',
        destructive: true,
        onConfirm: async () => {
          const updatedCharacter = Object.assign(
            Object.create(Object.getPrototypeOf(character)),
            character,
            { feats: [...(character.feats ?? [])] },
          ) as Character;

          try {
            updatedCharacter.removeFeat(feat);

            await saveCharacter(updatedCharacter);
            setCharacter(updatedCharacter);
            setError(null);
          } catch (err) {
            showInfo(
              'Could not remove feat',
              err instanceof Error ? err.message : 'Failed to save the change.',
            );
          }
        },
      });
    },
    [character, showConfirm, showInfo],
  );

  const handleUploadPortrait = useCallback(
    async (uri: string) => {
      if (!character) return;

      const updatedCharacter = Object.assign(
        Object.create(Object.getPrototypeOf(character)),
        character,
        { portraitPath: uri },
      ) as Character;

      try {
        await saveCharacter(updatedCharacter);
        setCharacter(updatedCharacter);
        setError(null);
      } catch (err) {
        showInfo(
          'Save failed',
          err instanceof Error ? err.message : 'Could not save the portrait.',
        );
      }
    },
    [character, showInfo, saveCharacter],
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          backgroundColor: colors.background,
        }}
      >
        <Text
          style={{
            color: colors.text,
            textAlign: 'center',
          }}
        >
          {error}
        </Text>
      </View>
    );
  }

  if (!character) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          backgroundColor: colors.background,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: '600',
            marginBottom: 8,
          }}
        >
          No characters found
        </Text>

        <Text
          style={{
            color: colors.textSecondary,
            textAlign: 'center',
          }}
        >
          Add a character to the database to display it here.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {readOnly && (
        <Text style={{ color: colors.textSecondary }}>
          Read-only player character. Only its owner can make changes.
        </Text>
      )}
      <CharacterReadOnlyContext.Provider value={readOnly}>
        <View
          onLayout={(event) =>
            onSectionLayout?.('overview', event.nativeEvent.layout.y)
          }
        >
          <View
            onLayout={(event) =>
              onSectionLayout?.('character', event.nativeEvent.layout.y)
            }
          >
            <HeroSection
              character={character}
              onTakeRest={async (restType) => {
                const updatedCharacter = Object.assign(
                  Object.create(Object.getPrototypeOf(character)),
                  character,
                ) as Character;

                updatedCharacter.takeRest(restType);
                await handleCombatUpdate(updatedCharacter);
              }}
              onChangeText={handleChangeText}
              onAddFeat={handleAddFeat}
              onRemoveFeat={handleRemoveFeat}
              onAddCondition={handleAddCondition}
              onRemoveCondition={handleRemoveCondition}
              onAddTrait={handleAddTrait}
              onRemoveTrait={handleRemoveTrait}
              onUploadPortrait={handleUploadPortrait}
              onAddBonus={handleAddCombatBonus}
            />
          </View>
        </View>

        <View
          onLayout={(event) =>
            onSectionLayout?.('combat-stats', event.nativeEvent.layout.y)
          }
        >
          <CombatStats
            character={character}
            onUpdate={handleCombatUpdate}
            onAddBonus={handleAddCombatBonus}
          />
        </View>

        <View
          onLayout={(event) =>
            onSectionLayout?.('weapons', event.nativeEvent.layout.y)
          }
        >
          <WeaponCards character={character} onUpdate={handleCombatUpdate} />
        </View>

        <View
          onLayout={(event) =>
            onSectionLayout?.('spell-slots', event.nativeEvent.layout.y)
          }
        >
          <SpellColumn character={character} onUpdate={handleCombatUpdate} />
        </View>

        <View
          onLayout={(event) =>
            onSectionLayout?.('ability-scores', event.nativeEvent.layout.y)
          }
        >
          <AbilityScores
            character={character}
            onAddBonus={handleAddAbilityBonus}
          />
        </View>

        <View
          onLayout={(event) =>
            onSectionLayout?.('equipment', event.nativeEvent.layout.y)
          }
        >
          <Equipment character={character} onUpdate={handleCombatUpdate} />
        </View>

        <View
          onLayout={(event) =>
            onSectionLayout?.('class-actions', event.nativeEvent.layout.y)
          }
        >
          <ClassActions character={character} onUpdate={handleCombatUpdate} />
        </View>

        <View
          onLayout={(event) =>
            onSectionLayout?.('skills', event.nativeEvent.layout.y)
          }
        >
          <Skills
            character={character}
            onUpdate={handleCombatUpdate}
            onAddBonus={handleAddSkillBonus}
          />
        </View>

        <View
          onLayout={(event) =>
            onSectionLayout?.('saving-throws', event.nativeEvent.layout.y)
          }
        >
          <SavingThrows
            character={character}
            onUpdate={handleCombatUpdate}
            onAddBonus={handleAddSavingThrowBonus}
          />
        </View>

        <View
          onLayout={(event) =>
            onSectionLayout?.('proficiencies', event.nativeEvent.layout.y)
          }
        >
          <Proficiencies character={character} onUpdate={handleCombatUpdate} />
        </View>

        <View
          onLayout={(event) =>
            onSectionLayout?.('defenses', event.nativeEvent.layout.y)
          }
        >
          <Defenses character={character} onUpdate={handleCombatUpdate} />
        </View>

        <View
          onLayout={(event) =>
            onSectionLayout?.('spellbook', event.nativeEvent.layout.y)
          }
        >
          <SpellbookCard character={character} onUpdate={handleCombatUpdate} />
        </View>

        <View
          onLayout={(event) =>
            onSectionLayout?.('notes', event.nativeEvent.layout.y)
          }
        >
          <NotesCard character={character} onUpdate={handleCombatUpdate} />
        </View>

        <View
          onLayout={(event) =>
            onSectionLayout?.('character-log', event.nativeEvent.layout.y)
          }
        >
          <CharacterLogCard character={character} />
        </View>

        {bonusTarget && (
          <BonusManager
            visible
            character={character}
            stat={bonusTarget.stat}
            title={bonusTarget.title}
            categories={bonusTarget.categories}
            initialCategory={bonusTarget.initialCategory}
            onUpdate={handleCombatUpdate}
            onClose={() => setBonusTarget(null)}
          />
        )}
      </CharacterReadOnlyContext.Provider>
    </View>
  );
}

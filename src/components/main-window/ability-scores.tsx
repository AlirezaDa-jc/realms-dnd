import {
    Pressable,
    Text,
    useColorScheme,
    View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import type { Ability } from '@/models/character';
import { Character } from '@/models/character';
import { BlurView } from 'expo-blur';

type AbilityScoresProps = {
    character: Character;
    onAddBonus?: (
        ability: Ability,
        category: 'ability_score' | 'ability_check' | 'saving_throw',
    ) => void;
};

const ABILITY_NAMES: { name: string; ability: Ability }[] = [
    { name: 'STR', ability: 'str' },
    { name: 'DEX', ability: 'dex' },
    { name: 'CON', ability: 'con' },
    { name: 'INT', ability: 'int' },
    { name: 'WIS', ability: 'wis' },
    { name: 'CHA', ability: 'cha' },
];

export default function AbilityScores({
    character,
    onAddBonus,
}: AbilityScoresProps) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    return (
        <BlurView
            intensity={scheme === 'dark' ? 35 : 55}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={{
                borderRadius: 18,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
                marginTop: 16,
            }}
        >
            <View style={{ padding: 18, gap: 16 }}>
                <Text
                    style={{
                        color: colors.accent,
                        fontSize: 12,
                        fontWeight: '800',
                        letterSpacing: 2,
                    }}
                >
                    ABILITY SCORES
                </Text>

                <View
                    style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 10,
                    }}
                >
                    {ABILITY_NAMES.map(({ name, ability }) => {
                        const score = character.abilityScore(ability);
                        const modifier = character.abilityModifier(ability);
                        const bonuses = character.getStatBonuses(
                            ability,
                            'ability_score',
                        );

                        const bonusSummary = bonuses.length
                            ? bonuses
                                .map(
                                    (bonus) =>
                                        `${bonus.amount >= 0 ? '+' : ''}${bonus.amount} (${bonus.reason})`,
                                )
                                .join(' · ')
                            : 'No bonuses';

                        return (
                            <View
                                key={ability}
                                style={{
                                    flexGrow: 1,
                                    flexBasis: '28%',
                                    minWidth: 85,
                                    padding: 10,
                                    gap: 7,
                                    borderRadius: 12,
                                    backgroundColor: colors.backgroundElement,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color: colors.textSecondary,
                                        fontSize: 11,
                                        fontWeight: '800',
                                        letterSpacing: 1,
                                    }}
                                >
                                    {name}
                                </Text>

                                <Text
                                    style={{
                                        color: colors.text,
                                        fontSize: 25,
                                        fontWeight: '800',
                                    }}
                                >
                                    {score}
                                </Text>

                                <Text
                                    style={{
                                        color: colors.accent,
                                        fontSize: 14,
                                        fontWeight: '700',
                                    }}
                                >
                                    {modifier >= 0 ? '+' : ''}
                                    {modifier}
                                </Text>

                                <Text
                                    style={{
                                        color: colors.textSecondary,
                                        fontSize: 11,
                                        textAlign: 'center',
                                    }}
                                >
                                    {bonusSummary}
                                </Text>

                                <Pressable
                                    onPress={() =>
                                        onAddBonus?.(ability, 'ability_score')
                                    }
                                    style={{
                                        width: '100%',
                                        alignItems: 'center',
                                        paddingVertical: 7,
                                        paddingHorizontal: 8,
                                        borderRadius: 8,
                                        backgroundColor:
                                            colors.backgroundSelected,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: colors.text,
                                            fontSize: 12,
                                            fontWeight: '700',
                                        }}
                                    >
                                        Bonus
                                    </Text>
                                </Pressable>
                            </View>
                        );
                    })}
                </View>
            </View>
        </BlurView>
    );
}

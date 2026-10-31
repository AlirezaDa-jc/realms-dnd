import {
  CampaignButton,
  CampaignLoading,
} from '@/components/campaigns/campaign-ui';
import { useCampaign } from '@/campaigns/campaign-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

export default function UserHomeScreen() {
  const { chooseRole, loading, campaign, mode } = useCampaign();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  if (loading) return <CampaignLoading />;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>
          DUNGEONS & DRAGONS 2024
        </Text>
        <Text style={[styles.title, { color: colors.text }]}>REALMS</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Choose your mode
        </Text>
      </View>

      <View style={styles.options}>
        <ModeCard
          badge="P"
          title="Player"
          description="Manage your characters, abilities, equipment, spells, and resources."
          color={colors.accent}
          cardColor={colors.backgroundElement}
          borderColor={colors.border}
          textColor={colors.text}
          secondaryColor={colors.textSecondary}
          onPress={() => {
            chooseRole('player');
            router.push('/user/campaigns');
          }}
        />
        <ModeCard
          badge="DM"
          title="Dungeon Master"
          description="Manage your party, combat, characters, and NPCs."
          color={colors.accent}
          cardColor={colors.backgroundElement}
          borderColor={colors.border}
          textColor={colors.text}
          secondaryColor={colors.textSecondary}
          onPress={() => {
            chooseRole('dm');
            router.push('/user/campaigns');
          }}
        />
      </View>

      <View style={{
        marginVertical: Spacing.four
      }}>
        {campaign && mode && (
          <CampaignButton
            title={`Continue in ${campaign.name}`}
            onPress={() =>
              router.push(mode === 'dm' ? '/user/dm' : '/user/player')
            }
          />
        )}
      </View>

      <Text style={[styles.footer, { color: colors.textSecondary }]}>
        Your world. Your characters. Your story.
      </Text>
    </View>
  );
}

type ModeCardProps = {
  badge: string;
  title: string;
  description: string;
  color: string;
  cardColor: string;
  borderColor: string;
  textColor: string;
  secondaryColor: string;
  onPress: () => void;
};

function ModeCard({
  badge,
  title,
  description,
  color,
  cardColor,
  borderColor,
  textColor,
  secondaryColor,
  onPress,
}: ModeCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: cardColor,
          borderColor,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={[styles.badgeText, { color: cardColor }]}>{badge}</Text>
      </View>
      <View style={styles.cardCopy}>
        <Text style={[styles.cardTitle, { color: textColor }]}>{title}</Text>
        <Text style={[styles.description, { color: secondaryColor }]}>
          {description}
        </Text>
      </View>
      <Text style={[styles.arrow, { color }]}>{'>'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 44,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 7,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 10,
  },
  options: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: 16,
  },
  card: {
    minHeight: 126,
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '900',
  },
  cardCopy: {
    flex: 1,
    gap: 8,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
  },
  arrow: {
    fontSize: 30,
    fontWeight: '300',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 36,
  },
});

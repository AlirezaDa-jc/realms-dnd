import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import {
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export type AppMode = 'player' | 'dm';

type AppTabsProps = {
  mode: AppMode;
};

export default function AppTabs({ mode }: AppTabsProps) {
  const isPlayer = mode === 'player';

  return (
    <Tabs>
      <TabSlot style={styles.content} />

      <TabList asChild>
        <CustomTabList>
          {isPlayer ? (
            <TabTrigger name="index" href="/player" asChild>
              <TabButton>Home</TabButton>
            </TabTrigger>
          ) : (
            <>
              <TabTrigger name="index" href="/dm" asChild>
                <TabButton>Party</TabButton>
              </TabTrigger>

              <TabTrigger name="combat" href="/dm/combat" asChild>
                <TabButton>Combat</TabButton>
              </TabTrigger>

              <TabTrigger name="details" href="/dm/character" asChild>
                <TabButton>Details</TabButton>
              </TabTrigger>
            </>
          )}

          <TabTrigger
            name="characters"
            href={isPlayer ? '/player/characters' : '/dm/characters'}
            asChild
          >
            <TabButton>Characters</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  children,
  isFocused,
  ...props
}: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.tabButton,
        pressed && styles.pressed,
      ]}
    >
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonContent}
      >
        <ThemedText
          type="small"
          themeColor={isFocused ? 'text' : 'textSecondary'}
        >
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View
      {...props}
      style={[styles.tabListContainer, props.style]}
    >
      <ThemedView
        type="backgroundElement"
        style={[
          styles.tabList,
          { borderColor: colors.border },
        ]}
      >
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    minHeight: 0,
  },
  tabListContainer: {
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    padding: Spacing.two,
  },
  tabList: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.five,
  },
  tabButton: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
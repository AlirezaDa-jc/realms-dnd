import { Colors } from '@/constants/theme';
import { Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';

export const DASHBOARD_SECTIONS = [
    { id: 'overview', label: 'Overview' },
    { id: 'character', label: 'Character' },
    { id: 'combat-stats', label: 'Combat Stats' },
    { id: 'spell-slots', label: 'Spell Slots' },
    { id: 'ability-scores', label: 'Ability Scores' },
    { id: 'equipment', label: 'Equipment' },
    { id: 'class-actions', label: 'Class Actions' },
    { id: 'skills', label: 'Skills' },
    { id: 'saving-throws', label: 'Saving Throws' },
    { id: 'proficiencies', label: 'Proficiencies' },
    { id: 'defenses', label: 'Defenses' },
    { id: 'spellbook', label: 'Spellbook' },
    { id: 'notes', label: 'Notes' },
    { id: 'character-log', label: 'Character Log' },
] as const;

export type DashboardSection =
    (typeof DASHBOARD_SECTIONS)[number]['id'];

type SidebarProps = {
    activeSection: DashboardSection;
    onNavigate: (section: DashboardSection) => void;
};

export default function Sidebar({
    activeSection,
    onNavigate,
}: SidebarProps) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    return (

        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
                width: 220,
                padding: 20,
                gap: 24,
            }}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
        >

            <Text
                style={{
                    color: colors.accent,
                    fontSize: 25,
                    fontWeight: '800',
                    letterSpacing: 2,
                    marginTop: 30
                }}
            >
                REALMS
            </Text>

            <View style={{ gap: 8 }}>
                {DASHBOARD_SECTIONS.map((item) => {
                    const selected = item.id === activeSection;

                    return (
                        <Pressable
                            key={item.id}
                            onPress={() => onNavigate(item.id)}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            style={{
                                paddingVertical: 12,
                                paddingHorizontal: 14,
                                borderRadius: 8,
                                backgroundColor: selected
                                    ? colors.backgroundSelected
                                    : 'transparent',
                            }}
                        >
                            <Text
                                style={{
                                    color: colors.text,
                                    fontSize: 14,
                                    fontWeight: selected ? '700' : '400',
                                }}
                            >
                                {item.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </ScrollView>
    );
}

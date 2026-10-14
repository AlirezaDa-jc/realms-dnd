import { Colors } from '@/constants/theme';
import {
    Pressable,
    Text,
    useColorScheme,
    View
} from 'react-native';

const ITEMS = [
    'Overview',
    'Character',
    'Inventory',
    'Spells',
    'Features & Traits',
    'Notes',
];

type SidebarProps = {
    onNavigate?: (section: string) => void;
    activeSection?: string;
};

export default function Sidebar({
    onNavigate,
    activeSection = 'Overview',
}: SidebarProps) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

    return (
        <View
            style={{
                width: 220,
                padding: 20,
                gap: 24,
            }}
        >
            <Text
                style={{
                    color: colors.accent,
                    fontSize: 25,
                    fontWeight: '800',
                    letterSpacing: 2,
                    marginTop: 24
                }}
            >
                REALMS
            </Text>

            <View style={{ gap: 8 }}>
                {ITEMS.map((item) => {
                    const isActive = item === activeSection;

                    return (
                        <Pressable
                            key={item}
                            onPress={() => onNavigate?.(item)}
                            style={{
                                paddingVertical: 12,
                                paddingHorizontal: 14,
                                borderRadius: 8,
                                backgroundColor: isActive
                                    ? colors.backgroundSelected
                                    : 'transparent',
                            }}
                        >
                            <Text
                                style={{
                                    color: colors.text,
                                    fontSize: 14,
                                    fontWeight: isActive ? '700' : '400',
                                }}
                            >
                                {item}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

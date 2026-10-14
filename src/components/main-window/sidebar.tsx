
import { Colors } from '@/constants/theme';
import { Text, useColorScheme, View } from 'react-native';

const ITEMS = [
    'Overview',
    'Character',
    'Inventory',
    'Spells',
    'Features & Traits',
    'Notes',
];

export default function Sidebar() {
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
                }}
            >
                REALMS
            </Text>

            <View style={{ gap: 8 }}>
                {ITEMS.map((item, index) => (
                    <View
                        key={item}
                        style={{
                            paddingVertical: 12,
                            paddingHorizontal: 14,
                            borderRadius: 8,
                            backgroundColor:
                                index === 0 ? colors.backgroundSelected : 'transparent',
                        }}
                    >
                        <Text
                            style={{
                                color: colors.text,
                                fontSize: 14,
                                fontWeight: index === 0 ? '700' : '400',
                            }}
                        >
                            {item}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

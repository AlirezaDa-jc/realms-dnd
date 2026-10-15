
import { Colors } from '@/constants/theme';
import { Text, View } from 'react-native';
import { useColorScheme } from 'react-native';

export default function MainHeader() {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    return (
        <View
            style={{
                minHeight: 50,
                paddingHorizontal: 12,
                marginTop: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}
        >
            <View>
                <Text
                    numberOfLines={1}
                    style={{
                        color: colors.text,
                        fontSize: 18,
                        fontWeight: '700',
                    }}
                >
                    Character Manager
                </Text>
            </View>

            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
                D&D 5e · 2024
            </Text>
        </View>
    );
}

import { View } from 'react-native';
import ResourcesCard from './resources-card';
import SpellSlotsCard from './spell-slots-card';

export default function SpellColumn() {
    return (
        <View style={{ flex: 1, minWidth: 0, gap: 16 }}>
            <SpellSlotsCard />
            <ResourcesCard />
        </View>
    );
}
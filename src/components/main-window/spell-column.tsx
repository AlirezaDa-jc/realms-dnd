import { Character } from '@/models/character';
import { View } from 'react-native';
import ResourcesCard from './resources-card';
import SpellSlotsCard from './spell-slots-card';

type SpellColumnProps = {
    character: Character;
    onUpdate: (character: Character) => Promise<void>;
};

export default function SpellColumn({
    character,
    onUpdate,
}: SpellColumnProps) {
    return (
        <View style={{ flex: 1, minWidth: 0, gap: 16 }}>
            <SpellSlotsCard
                character={character}
                onUpdate={onUpdate}
            />
            <ResourcesCard
                character={character}
                onUpdate={onUpdate} 
                />
        </View>
    );
}
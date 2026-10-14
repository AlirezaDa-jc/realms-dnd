
import { useWindowDimensions, View } from 'react-native';
import CharacterIdentityCard from './character-identity-card';
import { RecoveryType } from '@/models/resource';

type HeroSectionProps = {
    name: string;
    species: string;
    characterClass: string;
    level: number;
    background: string;
    traits: string[];
    ideals: string;
    bonds: string;
    flaws: string;
    portraitUri?: string | null;
    onChangeText: (
        field: 'ideals' | 'bonds' | 'flaws',
        value: string,
    ) => void;
    onAddTrait: () => void;
    onRemoveTrait: (trait: string) => void;
    onUploadPortrait: () => void;
    onTakeRest: (restType: RecoveryType) => void | Promise<void>;
};

export default function HeroSection(props: HeroSectionProps) {
    const { width } = useWindowDimensions();

    return (
        <View style={{ width: '100%' }}>
            <CharacterIdentityCard
                {...props}
                horizontal={width >= 760}
            />
        </View>
    );
}

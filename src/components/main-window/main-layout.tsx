
import { useState } from 'react';
import {
    Pressable,
    ScrollView,
    Text,
    useColorScheme,
    View,
} from 'react-native';
import { Colors } from '@/constants/theme';
import Dashboard from './dashboard';
import MainHeader from './main-header';
import Sidebar from './sidebar';
import { BlurView } from 'expo-blur';

export default function MainLayout() {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.background,
            }}
        >
            <View style={{
                flexDirection: 'row', 
                alignItems: 'center', 
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                gap: 0
            }}>
                <Pressable
                    onPress={() => setSidebarOpen((open) => !open)}
                    accessibilityRole="button"
                    accessibilityLabel="Toggle sidebar"
                    style={{ padding: 24 }}
                >
                    <Text style={{ color: colors.text, fontSize: 24, marginTop: 18 }}>☰</Text>
                </Pressable>

                <View style={{ flex: 1 }}>
                    <MainHeader />
                </View>
            </View>

            <ScrollView
                contentContainerStyle={{
                    padding: 24,
                    gap: 24,
                }}
            >
                <Dashboard />
            </ScrollView>

            {sidebarOpen && (
                <>
                    {/* Backdrop */}
                    <Pressable
                        onPress={() => setSidebarOpen(false)}
                        style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            zIndex: 10,
                        }}
                    />

                    {/* Sidebar overlay */}
                    <BlurView
                        intensity={80}
                        tint={scheme === 'dark' ? 'dark' : 'light'}
                        style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: 0,
                            zIndex: 11,
                            elevation: 11,
                            overflow: 'hidden',
                            borderRightWidth: 1,
                            borderRightColor:
                                scheme === 'dark'
                                    ? 'rgba(255,255,255,0.15)'
                                    : 'rgba(255,255,255,0.65)',
                            backgroundColor:
                                scheme === 'dark'
                                    ? 'rgba(25,22,20,0.55)'
                                    : 'rgba(255,250,240,0.55)',
                        }}
                    >
                        <Sidebar />
                    </BlurView>
                </>
            )}
        </View>
    );
}

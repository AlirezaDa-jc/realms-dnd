import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DialogProvider } from '@/components/dialog/realms-dialog';
import { getDatabase } from '@/database/database';

SplashScreen.preventAutoHideAsync().catch(() => { });

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeDatabase() {
      try {
        await getDatabase();

        if (mounted) {
          setDatabaseReady(true);
        }
      } catch (error) {
        if (mounted) {
          setDatabaseError(
            error instanceof Error
              ? error.message
              : 'Failed to initialize the database.',
          );
        }
      }
    }

    initializeDatabase();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (databaseReady || databaseError) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [databaseReady, databaseError]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {databaseError ? (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
            Database initialization failed
          </Text>
          <Text style={{ textAlign: 'center' }}>{databaseError}</Text>
        </View>
      ) : databaseReady ? (
        <DialogProvider>
          <AnimatedSplashOverlay />

          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="player" />
            <Stack.Screen name="dm" />
            <Stack.Screen name="characters" />
          </Stack>
        </DialogProvider>
      ) : (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator size="large" />
        </View>
      )}
    </ThemeProvider>
  );
}
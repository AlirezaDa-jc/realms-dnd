import { CampaignProvider } from '@/campaigns/campaign-context';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { SessionProvider, useSession } from '@/auth/session-context';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DialogProvider } from '@/components/dialog/realms-dialog';
import { getDatabase } from '@/database/database';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeDatabase() {
      try {
        await getDatabase();
        if (mounted) setDatabaseReady(true);
      } catch (cause) {
        if (!mounted) return;
        setDatabaseError(
          cause instanceof Error
            ? cause.message
            : 'Failed to initialize the database.',
        );
      }
    }

    void initializeDatabase();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (databaseReady || databaseError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [databaseError, databaseReady]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {databaseError ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Database initialization failed</Text>
          <Text style={styles.errorCopy}>{databaseError}</Text>
        </View>
      ) : databaseReady ? (
        <SessionProvider>
          <DialogProvider>
            <CampaignProvider>
              <AuthenticatedRoutes />
            </CampaignProvider>
          </DialogProvider>
        </SessionProvider>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      )}
    </ThemeProvider>
  );
}

function AuthenticatedRoutes() {
  const { user, loading } = useSession();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={user !== null}>
          <Stack.Screen name="user" />
          <Stack.Screen name="characters" />
        </Stack.Protected>
        <Stack.Protected guard={user === null}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorCopy: { textAlign: 'center' },
});

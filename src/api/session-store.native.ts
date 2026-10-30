import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'realms.auth.session';

export async function readSession(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function writeSession(value: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, value);
}

export async function removeSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_TOKEN_KEY = 'adora.session-token';

function assertNativeSecureStorage() {
  if (Platform.OS === 'web') {
    throw new Error('Secure session storage is available only in native ADORA builds.');
  }
}

export async function saveSessionToken(token: string): Promise<void> {
  assertNativeSecureStorage();
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
}

export async function readSessionToken(): Promise<string | null> {
  assertNativeSecureStorage();
  return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
}

export async function clearSessionToken(): Promise<void> {
  assertNativeSecureStorage();
  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
}

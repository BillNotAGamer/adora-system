import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = 'adora.refresh-token';

function assertNativeSecureStorage() {
  if (Platform.OS === 'web') {
    throw new Error('Secure session storage is available only in native ADORA builds.');
  }
}

export async function saveRefreshToken(token: string): Promise<void> {
  assertNativeSecureStorage();
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function readRefreshToken(): Promise<string | null> {
  assertNativeSecureStorage();
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearRefreshToken(): Promise<void> {
  assertNativeSecureStorage();
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

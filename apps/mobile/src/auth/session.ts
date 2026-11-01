import { API_BASE_URL } from '../config/api';
import {
  clearRefreshToken,
  readRefreshToken,
  saveRefreshToken,
} from '../storage/secure-session';

type TokenResponse = {
  access_token: string;
  refresh_token: string | null;
  expires_in: number;
};

let inMemoryAccessToken: string | null = null;

async function postSession(path: string, body: object): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`ADORA session request failed with ${response.status}`);
  }
  return response.json() as Promise<TokenResponse>;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export async function startMobileSession(email: string, password: string): Promise<void> {
  const tokens = await postSession('/api/v1/auth/login', {
    email,
    password,
    client_type: 'mobile',
  });
  if (!tokens.refresh_token) {
    throw new Error('ADORA API did not return a mobile refresh token.');
  }
  inMemoryAccessToken = tokens.access_token;
  await saveRefreshToken(tokens.refresh_token);
}

export async function renewMobileSession(): Promise<string> {
  const refreshToken = await readRefreshToken();
  if (!refreshToken) {
    throw new Error('No ADORA mobile session is available.');
  }
  const tokens = await postSession('/api/v1/auth/refresh', {
    refresh_token: refreshToken,
    client_type: 'mobile',
  });
  if (!tokens.refresh_token) {
    throw new Error('ADORA API did not rotate the mobile refresh token.');
  }
  inMemoryAccessToken = tokens.access_token;
  await saveRefreshToken(tokens.refresh_token);
  return tokens.access_token;
}

export async function endMobileSession(): Promise<void> {
  const refreshToken = await readRefreshToken();
  try {
    if (refreshToken) {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    }
  } finally {
    inMemoryAccessToken = null;
    await clearRefreshToken();
  }
}

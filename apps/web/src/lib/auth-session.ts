import { apiUrl } from "./api";

type TokenResponse = {
  access_token: string;
  expires_in: number;
};

let inMemoryAccessToken: string | null = null;

async function postBrowserSession(path: string, body: object): Promise<TokenResponse> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`ADORA session request failed with ${response.status}`);
  }
  return response.json() as Promise<TokenResponse>;
}

export function getBrowserAccessToken(): string | null {
  return inMemoryAccessToken;
}

export async function startBrowserSession(email: string, password: string): Promise<string> {
  const tokens = await postBrowserSession("/api/v1/auth/login", {
    email,
    password,
    client_type: "web",
  });
  inMemoryAccessToken = tokens.access_token;
  return tokens.access_token;
}

export async function renewBrowserSession(): Promise<string> {
  const tokens = await postBrowserSession("/api/v1/auth/refresh", {
    client_type: "web",
  });
  inMemoryAccessToken = tokens.access_token;
  return tokens.access_token;
}

export async function endBrowserSession(): Promise<void> {
  try {
    const response = await fetch(apiUrl("/api/v1/auth/logout"), {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    if (!response.ok) {
      throw new Error(`ADORA logout failed with ${response.status}`);
    }
  } finally {
    inMemoryAccessToken = null;
  }
}

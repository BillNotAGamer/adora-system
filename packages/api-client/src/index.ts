import type { paths } from "./schema.js";

export type ApiPaths = paths;

export type ApiClientOptions = {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
};

export function createApiClient(options: ApiClientOptions) {
  const request = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  return {
    async health(signal?: AbortSignal) {
      const response = await request(`${baseUrl}/api/v1/health`, { signal });
      if (!response.ok) {
        throw new Error(`ADORA API health request failed with ${response.status}`);
      }
      return response.json() as Promise<
        paths["/api/v1/health"]["get"]["responses"]["200"]["content"]["application/json"]
      >;
    },
  };
}

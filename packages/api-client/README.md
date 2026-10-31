# ADORA API client

FastAPI OpenAPI is the authoritative contract. From the repository root:

```powershell
pnpm api:generate
pnpm --filter @adora/api-client build
```

The first command exports `services/api/openapi.json` and regenerates
`src/schema.d.ts` with `openapi-typescript`. Do not hand-maintain backend DTO copies.

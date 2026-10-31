# API contract workflow

1. Change FastAPI routes and response models with tests.
2. Run `pnpm api:generate` from the repository root.
3. Review the generated `packages/api-client/src/schema.d.ts` diff.
4. Type-check and build all JavaScript workspaces.

The generated `services/api/openapi.json` is a transient build artifact. The generated TypeScript
declarations are committed so clients and CI can detect contract changes.

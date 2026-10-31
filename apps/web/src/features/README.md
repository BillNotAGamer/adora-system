# Feature boundaries

Future customer and administration routes should be grouped by feature under this directory. Keep
route files thin, share presentation primitives through `components`, and consume backend contracts
through the generated `@adora/api-client` package rather than duplicating DTOs.

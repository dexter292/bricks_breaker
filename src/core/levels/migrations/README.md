# Level schema migrations

`migrateLevel` runs **after** `validateLevel` and **before** `compileLevel`.

## Current behavior (v1)

- Only `schemaVersion: 1` passes validation.
- `migrateLevel` is an **identity** for v1 (returns the same validated object).
- Unsupported versions never reach migrate — `validateLevel` rejects them with path `schemaVersion`.

## Adding v1 → v2

1. Bump `SCHEMA_VERSION` in `src/core/levels/schema.ts` to `2`.
2. Add `LevelFileV2` types (or evolve `LevelFileV1` → current shape).
3. Update `validateLevel` to accept both `1` and `2` **or** accept only raw v2 and migrate from v1 authoring files via a dedicated path.
4. Implement `migrateV1ToV2(level: LevelFileV1): LevelFileV2` in this folder.
5. Wire `migrateLevel` to:
   - identity for current version
   - call `migrateV1ToV2` when `schemaVersion === 1`
   - throw / never for unknown versions (validate already rejects)
6. Keep rejecting unknown `schemaVersion` values in `validateLevel` with an actionable `supported: N` message.
7. Add fixtures + tests for the new migrator before shipping levels that use v2.

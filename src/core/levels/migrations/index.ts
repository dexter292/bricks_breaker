/**
 * Level schema migrations.
 *
 * Unsupported schema versions are rejected in validateLevel before migrate runs (D-03).
 * For schemaVersion 1 this is an identity transform.
 */

import { SCHEMA_VERSION, type LevelFileV1 } from '../schema';

/**
 * Migrate a validated LevelFileV1 to the current SCHEMA_VERSION.
 * v1 → identity. Unsupported versions must never reach this function.
 */
export function migrateLevel(level: LevelFileV1): LevelFileV1 {
  if (level.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `migrateLevel: unsupported schemaVersion ${String(level.schemaVersion)} (expected ${SCHEMA_VERSION}); validateLevel must gate first`,
    );
  }
  return level;
}

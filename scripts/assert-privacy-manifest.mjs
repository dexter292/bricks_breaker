/**
 * Assert app.json has expo.ios.privacyManifests with required Apple keys.
 * Plan 05 fills app.json; Wave 0 creates the assert.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appJsonPath = join(root, 'app.json');

let app;
try {
  app = JSON.parse(readFileSync(appJsonPath, 'utf8'));
} catch (err) {
  console.error(`Failed to read/parse ${appJsonPath}:`, err.message);
  process.exit(1);
}

const manifests = app?.expo?.ios?.privacyManifests;
if (manifests == null || typeof manifests !== 'object' || Array.isArray(manifests)) {
  console.error('Expected expo.ios.privacyManifests to be an object');
  process.exit(1);
}

const requiredKeys = [
  'NSPrivacyTracking',
  'NSPrivacyTrackingDomains',
  'NSPrivacyCollectedDataTypes',
  'NSPrivacyAccessedAPITypes',
];

const missing = requiredKeys.filter((key) => !(key in manifests));
if (missing.length > 0) {
  console.error(`privacyManifests missing keys: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('privacyManifests OK');

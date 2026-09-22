/**
 * Assert expo.ios.privacyManifests has required Apple keys + expected
 * NSPrivacyAccessedAPITypes content (F-39 / T8.4).
 * Also checks a prebuild PrivacyInfo.xcprivacy when present under ios/.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

function loadExpoConfig() {
  const configJs = join(root, 'app.config.js');
  const configJson = join(root, 'app.json');

  if (existsSync(configJs)) {
    const factory = require(configJs);
    const resolved =
      typeof factory === 'function' ? factory({ config: {} }) : factory;
    return resolved?.expo ?? resolved;
  }

  if (existsSync(configJson)) {
    return JSON.parse(readFileSync(configJson, 'utf8'))?.expo;
  }

  console.error('Expected app.config.js or app.json');
  process.exit(1);
}

const EXPECTED_API_TYPES = {
  NSPrivacyAccessedAPICategoryUserDefaults: ['CA92.1'],
  NSPrivacyAccessedAPICategoryFileTimestamp: null, // ≥1 reason required
  NSPrivacyAccessedAPICategoryDiskSpace: ['E174.1', '85F4.1'],
  NSPrivacyAccessedAPICategorySystemBootTime: ['35F9.1'],
};

function assertManifestContent(manifests, sourceLabel) {
  if (manifests == null || typeof manifests !== 'object' || Array.isArray(manifests)) {
    console.error(`${sourceLabel}: Expected privacyManifests to be an object`);
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
    console.error(`${sourceLabel}: privacyManifests missing keys: ${missing.join(', ')}`);
    process.exit(1);
  }

  const apiTypes = manifests.NSPrivacyAccessedAPITypes;
  if (!Array.isArray(apiTypes)) {
    console.error(`${sourceLabel}: NSPrivacyAccessedAPITypes must be an array`);
    process.exit(1);
  }

  const byCategory = new Map();
  for (const entry of apiTypes) {
    const cat = entry?.NSPrivacyAccessedAPIType;
    const reasons = entry?.NSPrivacyAccessedAPITypeReasons;
    if (typeof cat !== 'string' || !Array.isArray(reasons)) {
      console.error(
        `${sourceLabel}: each NSPrivacyAccessedAPITypes entry needs type string + reasons array`,
      );
      process.exit(1);
    }
    byCategory.set(cat, reasons.map(String));
  }

  for (const [category, expectedReasons] of Object.entries(EXPECTED_API_TYPES)) {
    const reasons = byCategory.get(category);
    if (!reasons) {
      console.error(`${sourceLabel}: missing NSPrivacyAccessedAPIType ${category}`);
      process.exit(1);
    }
    if (expectedReasons === null) {
      if (reasons.length < 1) {
        console.error(
          `${sourceLabel}: ${category} must declare ≥1 reason code`,
        );
        process.exit(1);
      }
      continue;
    }
    for (const code of expectedReasons) {
      if (!reasons.includes(code)) {
        console.error(
          `${sourceLabel}: ${category} missing expected reason ${code} (have: ${reasons.join(', ')})`,
        );
        process.exit(1);
      }
    }
  }
}

function findPrivacyInfoFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'Pods' || name === 'build' || name === '.git') continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      findPrivacyInfoFiles(full, out);
    } else if (name === 'PrivacyInfo.xcprivacy') {
      out.push(full);
    }
  }
  return out;
}

/**
 * Minimal plist check: warn if NSPrivacyTrackingDomains key is absent or
 * DiskSpace category is missing from the generated artifact (ios/ is gitignored;
 * regenerate with `expo prebuild --clean` before release).
 */
function warnXcprivacy(path) {
  const text = readFileSync(path, 'utf8');
  const rel = path.slice(root.length + 1);
  let drifted = false;

  if (!text.includes('<key>NSPrivacyTrackingDomains</key>')) {
    console.warn(
      `${rel}: WARN missing NSPrivacyTrackingDomains key (prebuild drift vs app config — F-39)`,
    );
    drifted = true;
  }

  if (!text.includes('NSPrivacyAccessedAPICategoryDiskSpace')) {
    console.warn(
      `${rel}: WARN missing NSPrivacyAccessedAPICategoryDiskSpace (prebuild drift vs app config — F-39)`,
    );
    drifted = true;
  }

  return drifted;
}

const expo = loadExpoConfig();
const manifests = expo?.ios?.privacyManifests;
assertManifestContent(manifests, 'app config');

const iosRoot = join(root, 'ios');
if (existsSync(iosRoot)) {
  const files = findPrivacyInfoFiles(iosRoot).filter(
    (p) => !p.includes(`${join('ios', 'Pods')}`),
  );
  let anyDrift = false;
  for (const file of files) {
    if (warnXcprivacy(file)) anyDrift = true;
  }
  if (files.length > 0) {
    console.log(
      anyDrift
        ? `privacyManifests OK (config); WARN prebuild PrivacyInfo drift — run expo prebuild --clean before release`
        : `privacyManifests OK (config + ${files.length} PrivacyInfo.xcprivacy)`,
    );
  } else {
    console.log('privacyManifests OK (config; no app PrivacyInfo.xcprivacy yet)');
  }
} else {
  console.log('privacyManifests OK (config; ios/ not present)');
}

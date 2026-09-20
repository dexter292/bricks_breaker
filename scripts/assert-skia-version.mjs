import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version } = require('@shopify/react-native-skia/package.json');

if (version !== '2.12.0') {
  console.error(`Expected @shopify/react-native-skia@2.12.0, got ${version}`);
  process.exit(1);
}

console.log(`@shopify/react-native-skia@${version} OK`);

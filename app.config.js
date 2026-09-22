/**
 * Expo app config (Expo SDK 57).
 * Gates `expo-dev-client` out of production EAS builds (F-42 / T8.8).
 */
const includeDevClient =
  process.env.EAS_BUILD_PROFILE !== 'production' &&
  process.env.EXPO_PUBLIC_NO_DEV_CLIENT !== '1';

module.exports = ({ config }) => ({
  ...config,
  name: 'Neon Brick Breaker',
  slug: 'bricks-breaker',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'bricksbreaker',
  userInterfaceStyle: 'dark',
  ios: {
    bundleIdentifier: 'com.dexter292.bricksbreaker',
    // Use shared project icon (not Expo template assets/expo.icon — NF-5 / F-40).
    icon: './assets/images/icon.png',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [],
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType:
            'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          NSPrivacyAccessedAPIType:
            'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['C617.1', '0A2A.1', '3B52.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
        },
        {
          NSPrivacyAccessedAPIType:
            'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
      ],
    },
  },
  android: {
    package: 'com.dexter292.bricksbreaker',
    adaptiveIcon: {
      backgroundColor: '#000000',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    ...(includeDevClient ? ['expo-dev-client'] : []),
    [
      'expo-splash-screen',
      {
        backgroundColor: '#000000',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    [
      'expo-build-properties',
      {
        ios: {
          enableSceneSupport: true,
        },
      },
    ],
    [
      'expo-audio',
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundPlayback: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '9f72de84-a221-46f1-8afd-209bda078d86',
    },
  },
  owner: 'dexter292',
});

// Regenerates app.json from the profile selected by EXPO_PUBLIC_APP_NAME in .env.
//
// CommonJS on purpose: package.json declares "type": "commonjs", so this file
// previously failed with "Cannot use import statement outside a module" and
// could never run — which is how app.json silently drifted from it.
//
// It does not import src/utils/config/getConfig.js: that module is ESM (Metro
// compiles it for the app) and cannot be required across the CJS boundary.
// Instead the profile is discovered directly from the EXPO_PUBLIC_APP_NAME_*
// keys, so adding a profile to .env needs no change here.

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Single source of truth for the app version. After changing it, regenerate
// app.json and diff against the committed copy.
const APP_VERSION = '2.1.0';

const selected = process.env.EXPO_PUBLIC_APP_NAME;
if (!selected) {
  console.error('EXPO_PUBLIC_APP_NAME is not set in .env');
  process.exit(1);
}

// Find which EXPO_PUBLIC_APP_NAME_<SUFFIX> matches the selected app name.
const NAME_PREFIX = 'EXPO_PUBLIC_APP_NAME_';
const suffix = Object.keys(process.env)
  .filter((k) => k.startsWith(NAME_PREFIX))
  .map((k) => k.slice(NAME_PREFIX.length))
  .find((s) => process.env[`${NAME_PREFIX}${s}`] === selected);

if (!suffix) {
  console.error(`No .env profile found whose ${NAME_PREFIX}* matches "${selected}"`);
  process.exit(1);
}

const config = {
  appName: selected,
  // Names containing spaces cannot be lowercased into a valid slug, so a
  // profile may supply one explicitly.
  slug: process.env[`EXPO_PUBLIC_SLUG_${suffix}`] || selected.toLowerCase(),
  packageName: process.env[`EXPO_PUBLIC_PACKAGE_NAME_${suffix}`],
  projectId: process.env[`EXPO_PUBLIC_PROJECT_ID_${suffix}`],
};

for (const key of ['slug', 'packageName', 'projectId']) {
  if (!config[key]) {
    console.error(`${key} is missing for profile "${suffix}" (app "${selected}")`);
    process.exit(1);
  }
}

const appJson = {
  expo: {
    name: config.appName,
    slug: config.slug,
    version: APP_VERSION,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['assets/*'],
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          // Cleartext exceptions for on-prem Odoo servers reached by LAN IP.
          NSExceptionDomains: {
            '192.168.29.43': {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: true,
            },
            '192.168.100.175': {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: true,
            },
            '192.168.1.6': {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: true,
            },
          },
        },
      },
    },
    android: {
      splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
      adaptiveIcon: {
        backgroundColor: '#ffffff',
      },
      icon: './assets/icon.png',
      permissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.CAMERA',
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
      ],
      package: config.packageName,
      allowBackup: false,
      config: {
        googleMaps: {
          apiKey: '',
        },
      },
    },
    plugins: [
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: true,
            minSdkVersion: 24,
            compileSdkVersion: 35,
            targetSdkVersion: 35,
          },
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera for QR scanning',
        },
      ],
      'expo-font',
    ],
    updates: {
      enabled: false,
    },
    extra: {
      eas: {
        projectId: config.projectId,
      },
    },
    owner: 'setihel',
  },
};

fs.writeFileSync(path.join(process.cwd(), 'app.json'), JSON.stringify(appJson, null, 2) + '\n');
console.log(`app.json generated: ${config.appName} (${config.packageName}) v${APP_VERSION}`);

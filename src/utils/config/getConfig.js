
export const getConfig = (appName) => {
  const configs = {
    [process.env.EXPO_PUBLIC_APP_NAME_UAE]: {
      appName: process.env.EXPO_PUBLIC_APP_NAME_UAE,
      packageName: process.env.EXPO_PUBLIC_PACKAGE_NAME_UAE,
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID_UAE,
    },
    [process.env.EXPO_PUBLIC_APP_NAME_OMAN]: {
      appName: process.env.EXPO_PUBLIC_APP_NAME_OMAN,
      packageName: process.env.EXPO_PUBLIC_PACKAGE_NAME_OMAN,
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID_OMAN,
    },
    // newly added
    [process.env.EXPO_PUBLIC_APP_NAME_UAE_TEST]: {
      appName: process.env.EXPO_PUBLIC_APP_NAME_UAE_TEST,
      packageName: process.env.EXPO_PUBLIC_PACKAGE_NAME_UAE_TEST,
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID_UAE_TEST,
    },
    [process.env.EXPO_PUBLIC_APP_NAME_ALPHA]: {
      appName: process.env.EXPO_PUBLIC_APP_NAME_ALPHA,
      packageName: process.env.EXPO_PUBLIC_PACKAGE_NAME_ALPHA,
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID_ALPHA,
    },
    // NEXGENN Restaurant — separate app from ALPHA above (own package + EAS
    // project). Carries an explicit slug: the other profiles derive one by
    // lowercasing appName, which only works for single-word names.
    [process.env.EXPO_PUBLIC_APP_NAME_RESTAURANT]: {
      appName: process.env.EXPO_PUBLIC_APP_NAME_RESTAURANT,
      slug: process.env.EXPO_PUBLIC_SLUG_RESTAURANT,
      packageName: process.env.EXPO_PUBLIC_PACKAGE_NAME_RESTAURANT,
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID_RESTAURANT,
    },
  };

  const config = configs[appName] || {};
  // Fall back to the old lowercase-the-name behaviour for profiles without one.
  if (config.appName && !config.slug) {
    config.slug = config.appName.toLowerCase();
  }
  return config;
};

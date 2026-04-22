import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solenne.td',
  appName: 'Solenne TD',
  webDir: 'dist',
  backgroundColor: '#050810',
  ios: {
    contentInset: 'always',
    scrollEnabled: false,
    backgroundColor: '#050810',
  },
  android: {
    backgroundColor: '#050810',
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;

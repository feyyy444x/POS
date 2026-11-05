import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.nexapos.app',
  appName: 'ChillPos',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.acoPos.app',
  appName: 'acoPos',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;

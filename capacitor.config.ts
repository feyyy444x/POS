import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.acopos.app',
  appName: 'acoPos',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;

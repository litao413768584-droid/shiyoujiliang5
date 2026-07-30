import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.petroleum.calc',
  appName: 'Remix 石油计量',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

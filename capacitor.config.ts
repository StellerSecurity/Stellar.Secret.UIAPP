import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'stellar.secret.app',
  appName: 'Secret',
  webDir: 'dist/app/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;

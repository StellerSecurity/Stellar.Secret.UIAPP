import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'stellar.secret.app',
  appName: 'Secret',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  }
};

export default config;

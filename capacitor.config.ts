/// <reference types="@capacitor-firebase/authentication" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.astikan.healthcare',
  appName: 'Astikan',
  webDir: 'dist',
  server: {
    hostname: 'employee.astikan.tech',
    androidScheme: 'https'
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['phone', 'google.com']
    }
  }
};

export default config;

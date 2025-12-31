import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sudoprogrammer.plancraftai',
  appName: 'PlanCraftAI',
  webDir: '../apps/audit-agent-frontend/dist',
  bundledWebRuntime: false,
  npmClient: 'pnpm',

  server: {
    cleartext: false,
    hostname: 'plancraftai.com',
    iosScheme: 'https', // ✅ REQUIRED for Firebase redirect
    androidScheme: 'https', // ✅ REQUIRED for Firebase redirect
  },

  allowNavigation: [
    'accounts.google.com',
    '*.googleusercontent.com',
    '*.firebaseapp.com',
    '*.google.com',
  ],
};

export default config;
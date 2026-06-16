import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sudoprogrammer.plancraftai',
  appName: 'PlanCraftAI',
  webDir: '../apps/audit-agent-frontend/dist',
  bundledWebRuntime: false,
  npmClient: 'pnpm',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert', 'banner', 'list'],
    },
  },

  server: {
    cleartext: false,
    hostname: 'plancraftai.com', // ✅ IMPORTANT: must match the domain used in Firebase Auth
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

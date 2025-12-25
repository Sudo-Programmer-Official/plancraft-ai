import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sudoprogrammer.plancraftai',
  appName: 'PlanCraftAI',
  webDir: '../apps/audit-agent-frontend/dist',
  bundledWebRuntime: false,
  npmClient: 'pnpm',
  server: {
    cleartext: false,
  },
};

export default config;

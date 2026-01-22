function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

const offlineEnv =
  process.env.ENABLE_OFFLINE_MESSAGES ??
  process.env.VITE_ENABLE_OFFLINE_MESSAGES ??
  process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MESSAGES;

export const FLAGS = {
  OFFLINE_MESSAGES_ENABLED: parseBoolean(offlineEnv, false),
};

if (!FLAGS.OFFLINE_MESSAGES_ENABLED) {
  console.info("[CostGuard] Offline SMS fallback disabled globally (kill switch)");
}

export function offlineMessagesEnabled() {
  return FLAGS.OFFLINE_MESSAGES_ENABLED;
}

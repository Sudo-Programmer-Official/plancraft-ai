export const DEFAULT_NOTIFICATION_SOUND = "default";
export const WAKING_NOTIFICATION_SOUND = "wake_chime";
export const SOFT_BELL_SOUND = "soft_bell";
export const RISING_ALARM_SOUND = "rising_alarm";

const SOUND_DEFINITIONS = {
  [DEFAULT_NOTIFICATION_SOUND]: {
    label: "System default",
    androidChannelId: "task_reminders_default",
    androidSound: "default",
    iosFile: "default",
  },
  [WAKING_NOTIFICATION_SOUND]: {
    label: "Wake-up chime",
    androidChannelId: "task_reminders_wake_chime",
    androidSound: WAKING_NOTIFICATION_SOUND,
    iosFile: "wake_chime.wav",
  },
  [SOFT_BELL_SOUND]: {
    label: "Soft bell",
    androidChannelId: "task_reminders_soft_bell",
    androidSound: SOFT_BELL_SOUND,
    iosFile: "soft_bell.wav",
  },
  [RISING_ALARM_SOUND]: {
    label: "Rising alarm",
    androidChannelId: "task_reminders_rising_alarm",
    androidSound: RISING_ALARM_SOUND,
    iosFile: "rising_alarm.wav",
  },
};

export const NOTIFICATION_SOUND_OPTIONS = Object.entries(SOUND_DEFINITIONS).map(
  ([value, meta]) => ({
    value,
    label: meta.label,
  }),
);

export function normalizeNotificationSound(value) {
  const token = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (SOUND_DEFINITIONS[token]) return token;
  return DEFAULT_NOTIFICATION_SOUND;
}

export function getNotificationSoundMeta(value) {
  return (
    SOUND_DEFINITIONS[normalizeNotificationSound(value)] ||
    SOUND_DEFINITIONS[DEFAULT_NOTIFICATION_SOUND]
  );
}

export function resolveAndroidNotificationChannelId(sound) {
  return getNotificationSoundMeta(sound).androidChannelId;
}

export function resolveAndroidNotificationSound(sound) {
  return getNotificationSoundMeta(sound).androidSound;
}

export function resolveIosNotificationSound(sound) {
  return getNotificationSoundMeta(sound).iosFile;
}

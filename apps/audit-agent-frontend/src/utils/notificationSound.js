export const DEFAULT_NOTIFICATION_SOUND = 'default'
export const WAKING_NOTIFICATION_SOUND = 'wake_chime'
export const SOFT_BELL_SOUND = 'soft_bell'
export const RISING_ALARM_SOUND = 'rising_alarm'

const SOUND_DEFINITIONS = {
  [DEFAULT_NOTIFICATION_SOUND]: {
    label: 'System default',
    androidChannelId: 'task_reminders_default',
    androidSound: 'default',
    iosFile: 'default',
  },
  [WAKING_NOTIFICATION_SOUND]: {
    label: 'Wake-up chime',
    androidChannelId: 'task_reminders_wake_chime',
    androidSound: WAKING_NOTIFICATION_SOUND,
    iosFile: 'wake_chime.wav',
  },
  [SOFT_BELL_SOUND]: {
    label: 'Soft bell',
    androidChannelId: 'task_reminders_soft_bell',
    androidSound: SOFT_BELL_SOUND,
    iosFile: 'soft_bell.wav',
  },
  [RISING_ALARM_SOUND]: {
    label: 'Rising alarm',
    androidChannelId: 'task_reminders_rising_alarm',
    androidSound: RISING_ALARM_SOUND,
    iosFile: 'rising_alarm.wav',
  },
}

export const NOTIFICATION_SOUND_OPTIONS = Object.entries(SOUND_DEFINITIONS).map(
  ([value, meta]) => ({
    value,
    label: meta.label,
  }),
)

export function normalizeNotificationSound(value) {
  const token = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (SOUND_DEFINITIONS[token]) return token
  return DEFAULT_NOTIFICATION_SOUND
}

export function getNotificationSoundMeta(value) {
  return (
    SOUND_DEFINITIONS[normalizeNotificationSound(value)] ||
    SOUND_DEFINITIONS[DEFAULT_NOTIFICATION_SOUND]
  )
}

export function resolveAndroidNotificationChannelId(sound) {
  return getNotificationSoundMeta(sound).androidChannelId
}

export function resolveAndroidNotificationSound(sound) {
  return getNotificationSoundMeta(sound).androidSound
}

export function resolveIosNotificationSound(sound) {
  return getNotificationSoundMeta(sound).iosFile
}

function getAudioContextCtor() {
  if (typeof window === 'undefined') return null
  return window.AudioContext || window.webkitAudioContext || null
}

function createToneEnvelope(
  context,
  destination,
  { frequency, startAt, duration, gain = 0.08, type = 'sine', endFrequency = null },
) {
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startAt)
  if (endFrequency !== null && endFrequency !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, endFrequency),
      startAt + duration,
    )
  }
  gainNode.gain.setValueAtTime(0.0001, startAt)
  gainNode.gain.exponentialRampToValueAtTime(gain, startAt + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  oscillator.connect(gainNode)
  gainNode.connect(destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.05)
}

export async function playNotificationSoundPreview(sound = DEFAULT_NOTIFICATION_SOUND) {
  const AudioCtor = getAudioContextCtor()
  if (!AudioCtor) {
    throw new Error('Audio preview is not supported in this environment.')
  }

  const context = new AudioCtor()
  if (typeof context.resume === 'function') {
    try {
      await context.resume()
    } catch {
      /* noop */
    }
  }

  const now = context.currentTime + 0.05
  const normalized = normalizeNotificationSound(sound)

  if (normalized === DEFAULT_NOTIFICATION_SOUND) {
    createToneEnvelope(context, context.destination, {
      frequency: 880,
      startAt: now,
      duration: 0.22,
      gain: 0.06,
    })
    createToneEnvelope(context, context.destination, {
      frequency: 660,
      startAt: now + 0.26,
      duration: 0.28,
      gain: 0.05,
    })
  } else if (normalized === WAKING_NOTIFICATION_SOUND) {
    createToneEnvelope(context, context.destination, {
      frequency: 523.25,
      startAt: now,
      duration: 0.32,
      gain: 0.08,
      endFrequency: 659.25,
    })
    createToneEnvelope(context, context.destination, {
      frequency: 659.25,
      startAt: now + 0.3,
      duration: 0.35,
      gain: 0.08,
      endFrequency: 783.99,
    })
    createToneEnvelope(context, context.destination, {
      frequency: 783.99,
      startAt: now + 0.64,
      duration: 0.42,
      gain: 0.075,
      endFrequency: 1046.5,
    })
  } else if (normalized === SOFT_BELL_SOUND) {
    createToneEnvelope(context, context.destination, {
      frequency: 784,
      startAt: now,
      duration: 0.5,
      gain: 0.06,
      type: 'triangle',
      endFrequency: 1046.5,
    })
    createToneEnvelope(context, context.destination, {
      frequency: 1046.5,
      startAt: now + 0.45,
      duration: 0.75,
      gain: 0.04,
      type: 'triangle',
      endFrequency: 1318.5,
    })
  } else if (normalized === RISING_ALARM_SOUND) {
    createToneEnvelope(context, context.destination, {
      frequency: 440,
      startAt: now,
      duration: 0.45,
      gain: 0.07,
      endFrequency: 554.37,
    })
    createToneEnvelope(context, context.destination, {
      frequency: 554.37,
      startAt: now + 0.3,
      duration: 0.45,
      gain: 0.08,
      endFrequency: 659.25,
    })
    createToneEnvelope(context, context.destination, {
      frequency: 659.25,
      startAt: now + 0.6,
      duration: 0.55,
      gain: 0.085,
      endFrequency: 880,
    })
    createToneEnvelope(context, context.destination, {
      frequency: 880,
      startAt: now + 1.05,
      duration: 0.6,
      gain: 0.09,
      endFrequency: 1174.66,
    })
  }

  const stopAt =
    now +
    (normalized === RISING_ALARM_SOUND
      ? 1.8
      : normalized === SOFT_BELL_SOUND
        ? 1.45
        : normalized === WAKING_NOTIFICATION_SOUND
          ? 1.2
          : 0.75)
  await new Promise((resolve) => {
    window.setTimeout(
      () => {
        try {
          context.close()
        } catch {
          /* noop */
        }
        resolve()
      },
      Math.max(50, (stopAt - context.currentTime) * 1000),
    )
  })
}

import { LOCAL_FLAGS } from './localFlags'
export { LOCAL_FLAGS } from './localFlags'

export const FEATURE_FLAG_KEYS = ['APPLE_AUTH', 'AUTO_DEPLOY', 'PLAYBOOKS'] as const
export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number]
export type FeatureFlagMap = Record<FeatureFlagKey, boolean>

export const DEFAULT_REMOTE_FLAGS: FeatureFlagMap = Object.freeze({
  APPLE_AUTH: false,
  AUTO_DEPLOY: false,
  PLAYBOOKS: true,
})

export const FEATURE_FLAG_META: Record<
  FeatureFlagKey,
  { label: string; description: string; disabledMessage: string }
> = {
  APPLE_AUTH: {
    label: 'Apple Sign-In',
    description: 'Controls Sign in with Apple across native and web entry points.',
    disabledMessage: 'Apple sign-in is temporarily disabled. Use OTP or email/password.',
  },
  AUTO_DEPLOY: {
    label: 'Auto Deploy',
    description: 'Controls publish / deployment flows that are still being stabilized.',
    disabledMessage: 'Publish and auto deployment are temporarily disabled right now.',
  },
  PLAYBOOKS: {
    label: 'Playbooks',
    description: 'Shows the Playbooks navigation and enables the checklist workflow MVP.',
    disabledMessage: 'Playbooks are not enabled for this build yet.',
  },
}

export function normalizeFeatureFlags(raw: Partial<Record<FeatureFlagKey, unknown>> = {}) {
  const next: Partial<FeatureFlagMap> = {}
  for (const key of FEATURE_FLAG_KEYS) {
    const value = raw[key]
    if (typeof value === 'boolean') next[key] = value
  }
  return next
}

export function hasLocalFlagOverride(key: FeatureFlagKey) {
  return typeof LOCAL_FLAGS[key] === 'boolean'
}

export function mergeFeatureFlags(rawRemoteFlags: Partial<Record<FeatureFlagKey, unknown>> = {}): FeatureFlagMap {
  const remoteFlags = normalizeFeatureFlags(rawRemoteFlags)
  const merged = {
    ...DEFAULT_REMOTE_FLAGS,
    ...remoteFlags,
  }

  for (const key of FEATURE_FLAG_KEYS) {
    if (hasLocalFlagOverride(key)) {
      merged[key] = Boolean(LOCAL_FLAGS[key])
    }
  }

  return merged
}

export function getFeatureFlag(key: FeatureFlagKey, rawRemoteFlags: Partial<Record<FeatureFlagKey, unknown>> = {}) {
  return mergeFeatureFlags(rawRemoteFlags)[key] ?? false
}

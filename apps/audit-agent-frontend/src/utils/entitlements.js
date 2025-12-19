const planLevels = { free: 0, starter: 1, pro: 2 }

export function canUseFeature(workspace, role, featureKey) {
  if (!workspace) return false
  const plan = (workspace.plan || 'free').toLowerCase()
  const level = planLevels[plan] ?? 0
  const features = workspace.features || {}
  const r = String(role || '').toLowerCase()
  const billingStatus = String(workspace.billingStatus || 'none').toLowerCase()
  const billingActive = ['active', 'trial'].includes(billingStatus)

  const roleAllows = () => {
    if (featureKey === 'advancedPermissions') return ['owner', 'admin', 'editor'].includes(r)
    return true
  }
  if (!roleAllows()) return false
  if (!billingActive) return false

  if (featureKey === 'voiceReminders') return level >= 1 || features.voiceReminders === true
  if (featureKey === 'advancedPermissions') return level >= 2 || features.advancedPermissions === true
  if (featureKey === 'prioritySupport') return level >= 2 || features.prioritySupport === true
  if (featureKey === 'invites') return level >= 1
  return true
}

export const FEATURE_KEYS = {
  voiceReminders: "voiceReminders",
  advancedPermissions: "advancedPermissions",
  prioritySupport: "prioritySupport",
};

export function canUseFeature({ workspace, userRole }, featureKey) {
  if (!workspace || !featureKey) return false;
  const role = String(userRole || "").toLowerCase();
  const plan = String(workspace.plan || "free").toLowerCase();
  const billingStatus = String(workspace.billingStatus || "none").toLowerCase();
  const features = workspace.features || {};

  const roleAllows = () => {
    if (featureKey === FEATURE_KEYS.advancedPermissions) return role === "admin" || role === "editor" || role === "owner";
    return true;
  };

  if (!roleAllows()) return false;

  const billingActive = ["active", "trial"].includes(billingStatus);
  if (!billingActive) return false;

  if (featureKey === FEATURE_KEYS.voiceReminders) {
    return plan === "starter" || plan === "pro" || features.voiceReminders === true;
  }
  if (featureKey === FEATURE_KEYS.advancedPermissions) {
    return plan === "pro" || features.advancedPermissions === true;
  }
  if (featureKey === FEATURE_KEYS.prioritySupport) {
    return plan === "pro" || features.prioritySupport === true;
  }
  return false;
}

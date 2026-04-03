import { isIosPackagedApp } from '@/utils/nativeAuthSupport'

export const BILLING_WEB_HOST = 'plancraftai.com'
export const BILLING_WEB_URL = `https://${BILLING_WEB_HOST}`

export function isNativeWebBillingMode() {
  return isIosPackagedApp()
}

export function isAppleBillingSafeMode() {
  return isNativeWebBillingMode()
}

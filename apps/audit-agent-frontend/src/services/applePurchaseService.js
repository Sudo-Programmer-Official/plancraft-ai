import { registerPlugin } from '@capacitor/core'
import api from '@/services/api'
import { isIosPackagedApp } from '@/utils/nativeAuthSupport'
import { EVENTS, trackEvent } from '@/services/analytics'

const ApplePurchases = registerPlugin('ApplePurchases')

export const SOLO_PREMIUM_APPLE_PRODUCT_ID =
  String(import.meta.env.VITE_APPLE_SOLO_PREMIUM_PRODUCT_ID || 'solo_premium_monthly').trim() ||
  'solo_premium_monthly'

function logInfo(message, payload = {}) {
  console.info(`[AppleIAP] ${message}`, payload)
}

function logWarn(message, payload = {}) {
  console.warn(`[AppleIAP] ${message}`, payload)
}

function logError(message, payload = {}) {
  console.error(`[AppleIAP] ${message}`, payload)
}

function normalizeProduct(raw = {}) {
  return {
    productId: String(raw?.productId || raw?.id || '').trim() || null,
    title: String(raw?.title || raw?.displayName || '').trim(),
    description: String(raw?.description || '').trim(),
    displayPrice: String(raw?.displayPrice || raw?.price || '').trim(),
    type: String(raw?.type || '').trim() || 'subscription',
  }
}

function normalizeTransaction(raw = {}) {
  return {
    productId: String(raw?.productId || raw?.id || '').trim() || null,
    status: String(raw?.status || '').trim().toLowerCase() || 'unknown',
    rawStatus: raw?.rawStatus ? String(raw.rawStatus).trim() : null,
    transactionId: raw?.transactionId == null ? null : String(raw.transactionId),
    originalTransactionId: raw?.originalTransactionId == null ? null : String(raw.originalTransactionId),
    purchaseDate: raw?.purchaseDate || null,
    expiresAt: raw?.expiresAt || null,
    revocationDate: raw?.revocationDate || null,
    ownershipType: raw?.ownershipType ? String(raw.ownershipType).trim() : null,
  }
}

function sortTransactionsNewestFirst(left, right) {
  const leftTime = Date.parse(left?.expiresAt || left?.purchaseDate || 0) || 0
  const rightTime = Date.parse(right?.expiresAt || right?.purchaseDate || 0) || 0
  return rightTime - leftTime
}

function pickBestTransaction(transactions = [], productId = SOLO_PREMIUM_APPLE_PRODUCT_ID) {
  return [...transactions]
    .map((entry) => normalizeTransaction(entry))
    .filter((entry) => entry.productId === productId)
    .sort(sortTransactionsNewestFirst)[0] || null
}

function buildApplePurchaseError(error, fallbackMessage = 'Apple purchase failed') {
  const message =
    error?.message ||
    error?.localizedMessage ||
    error?.response?.data?.error ||
    fallbackMessage
  const nextError = new Error(message)
  nextError.code = error?.code || error?.response?.data?.code || null
  nextError.cause = error
  return nextError
}

function requireIosApplePurchases() {
  if (isIosPackagedApp()) return
  throw buildApplePurchaseError(
    { code: 'apple_iap_unavailable', message: 'Apple in-app purchases are only available in the iOS app.' },
    'Apple in-app purchases are unavailable on this device.',
  )
}

export function canUseApplePurchases() {
  return isIosPackagedApp()
}

export async function loadSoloPremiumProduct() {
  requireIosApplePurchases()
  logInfo('Fetching Apple product', { productId: SOLO_PREMIUM_APPLE_PRODUCT_ID })

  try {
    const response = await ApplePurchases.getProducts({
      productIds: [SOLO_PREMIUM_APPLE_PRODUCT_ID],
    })
    const products = Array.isArray(response?.products)
      ? response.products.map((entry) => normalizeProduct(entry))
      : []
    const product = products.find((entry) => entry.productId === SOLO_PREMIUM_APPLE_PRODUCT_ID) || null

    logInfo('Product fetch completed', {
      productId: SOLO_PREMIUM_APPLE_PRODUCT_ID,
      found: !!product,
      count: products.length,
    })

    return product
  } catch (error) {
    logError('Product fetch failed', {
      productId: SOLO_PREMIUM_APPLE_PRODUCT_ID,
      message: error?.message || String(error),
      code: error?.code || null,
    })
    throw buildApplePurchaseError(error, 'Failed to load the Apple subscription product.')
  }
}

async function ingestAppleSubscription({ userId, transaction, origin = 'purchase' }) {
  const normalizedTransaction = normalizeTransaction(transaction || {})
  logInfo('Posting Apple subscription ingest', {
    userId,
    origin,
    productId: normalizedTransaction.productId,
    status: normalizedTransaction.status,
    expiresAt: normalizedTransaction.expiresAt,
    originalTransactionId: normalizedTransaction.originalTransactionId,
  })

  try {
    const { data } = await api.post('/subscription/apple/ingest', {
      userId,
      productId: normalizedTransaction.productId,
      status: normalizedTransaction.status,
      rawStatus: normalizedTransaction.rawStatus,
      expiresAt: normalizedTransaction.expiresAt,
      purchaseDate: normalizedTransaction.purchaseDate,
      revocationDate: normalizedTransaction.revocationDate,
      transactionId: normalizedTransaction.transactionId,
      originalTransactionId: normalizedTransaction.originalTransactionId,
      ownershipType: normalizedTransaction.ownershipType,
      origin,
    })

    logInfo('Apple subscription ingest completed', {
      userId,
      origin,
      plan: data?.plan || data?.subscription?.plan || null,
      status: data?.subscription?.status || null,
      source: data?.subscription?.source || null,
    })

    return data
  } catch (error) {
    logError('Apple subscription ingest failed', {
      userId,
      origin,
      message: error?.response?.data?.error || error?.message || String(error),
      code: error?.response?.status || error?.code || null,
    })
    throw buildApplePurchaseError(error, 'Failed to sync the Apple subscription with the server.')
  }
}

export async function purchaseSoloPremium({ userId }) {
  requireIosApplePurchases()
  if (!userId) {
    throw buildApplePurchaseError(
      { code: 'missing_user_id', message: 'Sign in is required before purchasing Solo Premium.' },
      'Sign in is required before purchasing Solo Premium.',
    )
  }

  trackEvent(EVENTS.CHECKOUT_STARTED, { provider: 'apple', scope: 'solo' })
  logInfo('Starting Apple purchase', {
    userId,
    productId: SOLO_PREMIUM_APPLE_PRODUCT_ID,
  })

  try {
    const response = await ApplePurchases.purchase({
      productId: SOLO_PREMIUM_APPLE_PRODUCT_ID,
    })
    const transaction = normalizeTransaction(response?.transaction || response || {})

    logInfo('Apple purchase completed', {
      userId,
      productId: transaction.productId,
      status: transaction.status,
      transactionId: transaction.transactionId,
      originalTransactionId: transaction.originalTransactionId,
    })

    const ingestResult = await ingestAppleSubscription({
      userId,
      transaction,
      origin: 'purchase',
    })

    return {
      transaction,
      ingestResult,
    }
  } catch (error) {
    const normalizedError = buildApplePurchaseError(error, 'Apple purchase failed.')
    if (normalizedError.code === 'purchase_cancelled') {
      logWarn('Apple purchase cancelled by user', {
        userId,
        productId: SOLO_PREMIUM_APPLE_PRODUCT_ID,
      })
    } else {
      logError('Apple purchase failed', {
        userId,
        productId: SOLO_PREMIUM_APPLE_PRODUCT_ID,
        message: normalizedError.message,
        code: normalizedError.code,
      })
    }
    throw normalizedError
  }
}

export async function restoreSoloPremiumPurchases({ userId }) {
  requireIosApplePurchases()
  if (!userId) {
    throw buildApplePurchaseError(
      { code: 'missing_user_id', message: 'Sign in is required before restoring Solo Premium.' },
      'Sign in is required before restoring Solo Premium.',
    )
  }

  logInfo('Starting Apple restore flow', {
    userId,
    productId: SOLO_PREMIUM_APPLE_PRODUCT_ID,
  })

  try {
    const response = await ApplePurchases.restorePurchases({
      productIds: [SOLO_PREMIUM_APPLE_PRODUCT_ID],
    })
    const transactions = Array.isArray(response?.transactions)
      ? response.transactions.map((entry) => normalizeTransaction(entry))
      : []
    const transaction = pickBestTransaction(transactions)

    logInfo('Apple restore completed', {
      userId,
      productId: SOLO_PREMIUM_APPLE_PRODUCT_ID,
      restoredCount: transactions.length,
      restored: !!transaction,
    })

    if (!transaction) {
      return {
        restored: false,
        transaction: null,
        transactions,
        ingestResult: null,
      }
    }

    const ingestResult = await ingestAppleSubscription({
      userId,
      transaction,
      origin: 'restore',
    })

    return {
      restored: true,
      transaction,
      transactions,
      ingestResult,
    }
  } catch (error) {
    const normalizedError = buildApplePurchaseError(error, 'Restore purchases failed.')
    logError('Apple restore failed', {
      userId,
      productId: SOLO_PREMIUM_APPLE_PRODUCT_ID,
      message: normalizedError.message,
      code: normalizedError.code,
    })
    throw normalizedError
  }
}

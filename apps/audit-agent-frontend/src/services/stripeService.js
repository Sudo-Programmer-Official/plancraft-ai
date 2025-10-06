// src/services/stripeService.js
import api from '@/services/api'

export async function createCheckoutSession(plan, userId) {
  try {
    const successUrl = window.location.origin + '/subscription?status=success'
    const cancelUrl = window.location.origin + '/subscription?status=cancel'
    const res = await api.post('/create-checkout-session', {
      plan,
      userId,
      successUrl,
      cancelUrl,
    })
    const url = res?.data?.url
    if (!url) throw new Error('No checkout URL returned')
    return url
  } catch (err) {
    const serverMsg = err?.response?.data?.error
    console.error('Stripe error:', serverMsg || err?.message)
    throw new Error(serverMsg || 'Payment service temporarily unavailable')
  }
}

export async function getSubscriptionStatus(userId) {
  try {
    const res = await api.get('/subscription/status', { params: { userId } })
    return res?.data || { plan: 'free', remainingDays: 0 }
  } catch (err) {
    console.error('Subscription status error:', err?.response?.data || err?.message)
    return { plan: 'free', remainingDays: 0 }
  }
}

export async function cancelSubscription(userId) {
  try {
    const res = await api.post('/subscription/cancel', { userId })
    return res?.data || { status: 'canceled' }
  } catch (err) {
    console.error('Cancel subscription error:', err?.response?.data || err?.message)
    throw err
  }
}

export async function reactivateSubscription(userId) {
  try {
    const successUrl = window.location.origin + '/subscription?reactivated=1'
    const cancelUrl = window.location.origin + '/subscription?reactivate=cancel'
    const res = await api.post('/subscription/reactivate', { uid: userId, successUrl, cancelUrl })
    const url = res?.data?.url
    if (!url) throw new Error('No checkout URL returned')
    return url
  } catch (err) {
    const serverMsg = err?.response?.data?.error
    console.error('Stripe reactivate error:', serverMsg || err?.message)
    throw new Error(serverMsg || 'Payment service temporarily unavailable')
  }
}

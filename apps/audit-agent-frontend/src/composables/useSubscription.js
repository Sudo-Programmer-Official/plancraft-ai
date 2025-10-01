// src/composables/useSubscription.js
import { ref } from 'vue'
import api from '@/services/api'

// Stripe price id from env
const monthlyPriceId = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || 'price_monthly_default'

// Shared reactive state
const subscription = ref({ plan: 'free', remainingDays: 0 })
let loaded = false

export function useSubscription(userId) {
  async function load() {
    if (!userId) return subscription.value
    try {
      const res = await api.get('/subscription/status', { params: { userId } })
      const data = res?.data || {}
      subscription.value = {
        plan: data.plan || 'free',
        remainingDays: Number(data.remainingDays || 0),
      }
    } catch (err) {
      console.warn('subscription/status failed; defaulting to free', err?.response?.data || err?.message)
      subscription.value = { plan: 'free', remainingDays: 0 }
    } finally {
      loaded = true
    }
    return subscription.value
  }

  async function checkout(priceId = monthlyPriceId) {
    try {
      const successUrl = window.location.origin + '/subscription?status=success'
      const cancelUrl = window.location.origin + '/subscription?status=cancel'
      const res = await api.post('/subscription/checkout', {
        userId,
        priceId,
        mode: 'subscription',
        successUrl,
        cancelUrl,
      })
      const url = res?.data?.url || res?.data?.checkoutUrl
      if (url) {
        window.location.href = url
        return
      }
      throw new Error('No checkout URL returned')
    } catch (err) {
      console.error('Checkout failed:', err?.response?.data || err?.message)
      throw err
    }
  }

  if (!loaded && userId) load()

  return {
    subscription,
    loadSubscription: load,
    checkout,
    monthlyPriceId,
  }
}


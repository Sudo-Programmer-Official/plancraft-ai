// src/stores/authStore.js
import { defineStore } from 'pinia'
import {
  signInAsGuest,
  signInWithGoogle, // still used for popup flow
  signOutUser,
  signInWithEmail,
  registerWithEmail,
  sendResetEmail,
  fetchUserProfile,
} from '@/services/authService'
import {
  onAuthStateChanged,
  onIdTokenChanged,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  linkWithPopup,
  linkWithCredential,
  signInWithCredential,
  signInWithRedirect,
  linkWithRedirect,
  getRedirectResult,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  EmailAuthProvider,
  PhoneAuthProvider,
} from 'firebase/auth'
import { auth, db } from '@/firebase/init'
import { identifyUser, trackEvent } from '@/services/analytics'
import { getUsageStatus } from '@/services/planService'
import { doc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { ElNotification } from 'element-plus'
import { clearAppToken } from '@/services/appTokenService'
import api from '@/services/api'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import {
  isNativePackagedApp,
  getNativeAuthRestriction,
  supportsNativeGoogleRedirectBridge,
} from '@/utils/nativeAuthSupport'
import {
  clearNativeIosAuthSnapshot,
  clearStoredAuthArtifacts,
  readNativeIosAuthSnapshot,
  writeNativeIosAuthSnapshot,
} from '@/utils/authStorage'
import {
  buildNativeAuthCallbackUrl,
  consumeMobileAuthHandoff,
  createMobileAuthHandoff,
  normalizeRedirectPath,
} from '@/services/mobileAuthHandoffService'

// 🧠 Helper: detect in-app / insecure browsers (LinkedIn, Instagram, etc.)
function isInAppBrowser() {
  const ua = navigator.userAgent || navigator.vendor || window.opera
  return /FBAN|FBAV|Instagram|LinkedInApp|Twitter/i.test(ua)
}

function isIosCapacitorApp() {
  try {
    return Capacitor?.getPlatform?.() === 'ios'
  } catch {
    return false
  }
}

function getPostLoginTarget() {
  try {
    const stored = localStorage.getItem('postLoginRedirect')
    if (stored) return normalizeRedirectPath(stored)
  } catch {}
  try {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('redirect')
    if (q) return normalizeRedirectPath(q)
  } catch {}
  return '/dashboard'
}

function markNativeGoogleHandoffIntent(redirectTarget) {
  try {
    const url = new URL(window.location.href)
    url.searchParams.set('native_handoff', 'android-google')
    url.searchParams.set('native_provider', 'google')
    url.searchParams.set('native_redirect', normalizeRedirectPath(redirectTarget))
    window.history.replaceState({}, '', url.toString())
  } catch {}
}

function clearNativeGoogleHandoffIntent() {
  try {
    const url = new URL(window.location.href)
    url.searchParams.delete('native_handoff')
    url.searchParams.delete('native_provider')
    url.searchParams.delete('native_redirect')
    window.history.replaceState({}, '', url.toString())
  } catch {}
}

function readStoredToken() {
  try {
    return localStorage.getItem('token') || ''
  } catch {
    return ''
  }
}

function getFirebaseApiKey() {
  return import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDI0qFImSxQFYkT5CRu2K1yEZuPX1W2xEY"
}

function parseJwtPayload(token) {
  try {
    const payload = String(token || '').split('.')[1]
    if (!payload) return {}
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    const parsed = JSON.parse(json)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function mapIdentityToolkitError(rawMessage) {
  const code = String(rawMessage || '').trim()
  switch (code) {
    case 'EMAIL_NOT_FOUND':
    case 'INVALID_LOGIN_CREDENTIALS':
    case 'INVALID_PASSWORD':
      return {
        code: 'auth/invalid-credential',
        message: 'Invalid email or password.',
      }
    case 'USER_DISABLED':
      return {
        code: 'auth/user-disabled',
        message: 'This account has been disabled.',
      }
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return {
        code: 'auth/too-many-requests',
        message: 'Too many login attempts. Please try again later.',
      }
    default:
      return {
        code: code ? `auth/${code.toLowerCase().replace(/_/g, '-')}` : null,
        message: code || 'Native sign-in failed.',
      }
  }
}

function buildNativeIosSnapshotFromIdentityToolkitSession(data, fallback = {}) {
  const claims = parseJwtPayload(data?.idToken || data?.id_token || fallback?.idToken || '')
  const expiresInRaw = Number(data?.expiresIn || data?.expires_in || fallback?.expiresIn || 3600)
  const expiresIn = Number.isFinite(expiresInRaw) && expiresInRaw > 0 ? expiresInRaw : 3600
  const obtainedAt = Date.now()
  return {
    localId: String(data?.localId || data?.local_id || data?.user_id || claims?.user_id || claims?.sub || fallback?.localId || ''),
    idToken: String(data?.idToken || data?.id_token || fallback?.idToken || ''),
    refreshToken: String(data?.refreshToken || data?.refresh_token || fallback?.refreshToken || ''),
    expiresIn,
    expiresAt: obtainedAt + (expiresIn * 1000),
    obtainedAt,
    email:
      (typeof data?.email === 'string' && data.email) ||
      (typeof claims?.email === 'string' && claims.email) ||
      fallback?.email ||
      '',
    displayName:
      (typeof data?.displayName === 'string' && data.displayName) ||
      (typeof claims?.name === 'string' && claims.name) ||
      fallback?.displayName ||
      '',
    photoUrl:
      (typeof data?.photoUrl === 'string' && data.photoUrl) ||
      (typeof data?.photoURL === 'string' && data.photoURL) ||
      (typeof claims?.picture === 'string' && claims.picture) ||
      fallback?.photoUrl ||
      '',
    phoneNumber:
      (typeof data?.phoneNumber === 'string' && data.phoneNumber) ||
      (typeof claims?.phone_number === 'string' && claims.phone_number) ||
      fallback?.phoneNumber ||
      '',
    emailVerified:
      typeof data?.emailVerified === 'boolean'
        ? data.emailVerified
        : claims?.email_verified === true || fallback?.emailVerified === true,
  }
}

function buildNativeIosSnapshotFromFirebaseUser(user, token = '') {
  const expiresAt = Number(user?.stsTokenManager?.expirationTime || 0)
  const expiresIn = Math.max(300, Math.round((expiresAt - Date.now()) / 1000) || 3600)
  const existing = readNativeIosAuthSnapshot() || {}
  return {
    localId: user?.uid || existing?.localId || '',
    idToken: token || existing?.idToken || '',
    refreshToken: user?.stsTokenManager?.refreshToken || existing?.refreshToken || '',
    expiresIn,
    expiresAt: expiresAt > 0 ? expiresAt : Date.now() + (expiresIn * 1000),
    obtainedAt: Date.now(),
    email: user?.email || existing?.email || '',
    displayName: user?.displayName || existing?.displayName || '',
    photoUrl: user?.photoURL || existing?.photoUrl || '',
    phoneNumber: user?.phoneNumber || existing?.phoneNumber || '',
    emailVerified: user?.emailVerified === true || existing?.emailVerified === true,
  }
}

function persistNativeIosAuthSnapshot(snapshotLike, fallback = {}) {
  const snapshot = buildNativeIosSnapshotFromIdentityToolkitSession(snapshotLike, fallback)
  if (!snapshot.localId || !snapshot.idToken || !snapshot.refreshToken) return
  writeNativeIosAuthSnapshot(snapshot)
}

async function refreshNativeIosAuthSnapshot(snapshot) {
  const apiKey = getFirebaseApiKey()
  const response = await withTimeout(
    CapacitorHttp.post({
      url: `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: `grant_type=refresh_token&refresh_token=${encodeURIComponent(snapshot?.refreshToken || '')}`,
      connectTimeout: 12000,
      readTimeout: 12000,
    }),
    12000,
    'native iOS token refresh',
  )

  const data = response?.data || {}
  const errorMessage = data?.error?.message
  if (errorMessage || !data?.id_token || !data?.refresh_token) {
    const mapped = mapIdentityToolkitError(errorMessage)
    const err = new Error(mapped.message)
    err.code = mapped.code
    throw err
  }

  return buildNativeIosSnapshotFromIdentityToolkitSession(
    {
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      localId: data.user_id,
      expiresIn: data.expires_in,
    },
    snapshot,
  )
}

async function restoreNativeIosSessionFromSnapshot() {
  const snapshot = readNativeIosAuthSnapshot()
  if (!snapshot?.localId || !snapshot?.refreshToken) return null

  let activeSnapshot = snapshot
  const expiresAt = Number(snapshot?.expiresAt || 0)
  if (!snapshot?.idToken || !expiresAt || expiresAt <= Date.now() + 60 * 1000) {
    activeSnapshot = await refreshNativeIosAuthSnapshot(snapshot)
    writeNativeIosAuthSnapshot(activeSnapshot)
  }

  const user = await hydrateNativeIosCustomTokenUser(activeSnapshot, activeSnapshot?.email || '', 2500)
  return {
    user,
    token: activeSnapshot?.idToken || '',
    snapshot: activeSnapshot,
  }
}

async function forceClearNativeIosAuthState() {
  try {
    const { _castAuth } = await import('@firebase/auth/internal')
    const authInternal = _castAuth(auth)
    try { authInternal.currentUser?._stopProactiveRefresh?.() } catch {}
    authInternal.currentUser = null
    try { authInternal.notifyAuthListeners?.() } catch {}
  } catch {}
}

async function nativeIosPasswordSignIn(email, password) {
  const apiKey = getFirebaseApiKey()
  const response = await withTimeout(
    CapacitorHttp.post({
      url: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
      headers: { 'Content-Type': 'application/json' },
      data: {
        email,
        password,
        returnSecureToken: true,
      },
      connectTimeout: 12000,
      readTimeout: 12000,
    }),
    12000,
    'native iOS password verification',
  )

  const data = response?.data || {}
  const errorMessage = data?.error?.message
  if (errorMessage || !data?.idToken) {
    const mapped = mapIdentityToolkitError(errorMessage)
    const err = new Error(mapped.message)
    err.code = mapped.code
    throw err
  }

  return data
}

async function exchangeNativeSessionForCustomToken(idToken, provider = 'password', platform = 'ios') {
  try {
    const response = await withTimeout(
      api.post('/auth/native-session/exchange', {
        idToken,
        provider,
        platform,
      }),
      12000,
      'native session exchange',
    )

    const customToken = String(response?.data?.customToken || '')
    if (!customToken) throw new Error('Missing Firebase custom token from native session exchange')
    return response.data
  } catch (error) {
    console.error('[Auth] Native session exchange failed', {
      endpoint: '/auth/native-session/exchange',
      status: error?.response?.status || null,
      code: error?.code || null,
      message: error?.message || String(error),
      responseData: error?.response?.data || null,
      hasAuthorizationHeader: !!(error?.config?.headers?.Authorization || error?.config?.headers?.authorization),
    })
    throw error
  }
}

async function nativeIosSignInWithCustomToken(customToken) {
  const apiKey = getFirebaseApiKey()
  const response = await withTimeout(
    CapacitorHttp.post({
      url: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
      headers: { 'Content-Type': 'application/json' },
      data: {
        token: customToken,
        returnSecureToken: true,
      },
      connectTimeout: 12000,
      readTimeout: 12000,
    }),
    12000,
    'native iOS custom token exchange',
  )

  const data = response?.data || {}
  const errorMessage = data?.error?.message
  const claims = parseJwtPayload(data?.idToken)
  const localId = String(data?.localId || claims?.user_id || claims?.sub || '')
  const email = typeof data?.email === 'string'
    ? data.email
    : typeof claims?.email === 'string'
      ? claims.email
      : undefined
  const displayName = typeof data?.displayName === 'string'
    ? data.displayName
    : typeof claims?.name === 'string'
      ? claims.name
      : undefined
  const photoUrl = typeof data?.photoUrl === 'string'
    ? data.photoUrl
    : typeof data?.photoURL === 'string'
      ? data.photoURL
      : typeof claims?.picture === 'string'
        ? claims.picture
        : undefined
  const emailVerified = typeof data?.emailVerified === 'boolean'
    ? data.emailVerified
    : claims?.email_verified === true

  if (errorMessage || !data?.idToken || !data?.refreshToken || !localId) {
    const mapped = mapIdentityToolkitError(errorMessage)
    const err = new Error(mapped.message)
    err.code = mapped.code
    throw err
  }

  return {
    ...data,
    localId,
    email,
    displayName,
    photoUrl,
    emailVerified,
  }
}

async function hydrateNativeIosCustomTokenUser(idTokenResponse, fallbackEmail = '', updateTimeoutMs = 8000) {
  const { _castAuth, UserImpl, updateCurrentUser } = await import('@firebase/auth/internal')
  const authInternal = _castAuth(auth)
  const now = String(Date.now())
  const expirationTime = Date.now() + (Number(idTokenResponse?.expiresIn || 3600) * 1000)

  const providerEmail = idTokenResponse?.email || fallbackEmail || null
  const providerData = providerEmail
    ? [{
        providerId: 'password',
        uid: providerEmail,
        email: providerEmail,
        displayName: idTokenResponse?.displayName || null,
        photoURL: idTokenResponse?.photoUrl || null,
        phoneNumber: idTokenResponse?.phoneNumber || null,
      }]
    : []

  const user = UserImpl._fromJSON(authInternal, {
    uid: idTokenResponse.localId,
    email: providerEmail,
    emailVerified: idTokenResponse?.emailVerified === true || !!providerEmail,
    displayName: idTokenResponse?.displayName || undefined,
    isAnonymous: false,
    photoURL: idTokenResponse?.photoUrl || undefined,
    phoneNumber: idTokenResponse?.phoneNumber || undefined,
    providerData,
    stsTokenManager: {
      accessToken: idTokenResponse.idToken,
      refreshToken: idTokenResponse.refreshToken,
      expirationTime,
    },
    createdAt: now,
    lastLoginAt: now,
  })

  try {
    await withTimeout(
      updateCurrentUser(auth, user),
      updateTimeoutMs,
      'native iOS updateCurrentUser',
    )
  } catch (error) {
    const currentUser = auth.currentUser
    if (currentUser?.uid === user.uid) {
      console.warn('[Auth] Native iOS updateCurrentUser timed out, but auth.currentUser is already set; continuing', {
        uid: currentUser.uid,
      })
      return currentUser
    }

    console.warn('[Auth] Native iOS updateCurrentUser timed out; applying in-memory auth fallback', {
      uid: user.uid,
      message: error?.message || String(error),
    })
    authInternal.currentUser = user
    try { user._startProactiveRefresh?.() } catch {}
    try { authInternal.notifyAuthListeners?.() } catch {}
    return user
  }

  return auth.currentUser || user
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)

    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

async function withFallback(promise, { ms = 8000, label = 'auth operation', fallback = null } = {}) {
  try {
    return await withTimeout(promise, ms, label)
  } catch (error) {
    console.warn(`[Auth] ${label} failed or timed out`, error)
    return typeof fallback === 'function' ? fallback() : fallback
  }
}

export const useAuthStore = defineStore('authStore', {
  state: () => ({
    user: null,
    token: null,
    loading: true,
    guest: false,
    usage: { used: 0, limit: 0, plan: '' },
    _refreshTimer: null,
    _profileUnsub: null,
  }),

  actions: {
    resetAuth() {
      this.user = null
      this.token = null
      this.guest = false
      this.loading = false
      try {
        if (this._refreshTimer) {
          clearInterval(this._refreshTimer)
          this._refreshTimer = null
        }
      } catch {}
      try {
        if (this._profileUnsub) {
          this._profileUnsub()
          this._profileUnsub = null
        }
      } catch {}
      clearStoredAuthArtifacts()
      if (isIosCapacitorApp()) {
        Promise.resolve(forceClearNativeIosAuthState()).catch(() => {})
      }
      try { clearAppToken() } catch {}
      try {
        import('@/stores/subscriptionStore').then((mod) => {
          try {
            mod.useSubscriptionStore().reset()
          } catch {}
        })
      } catch {}
      try {
        import('@/stores/workspaceStore').then((mod) => {
          try {
            mod.useWorkspaceStore().reset()
          } catch {}
        })
      } catch {}
    },

    async refreshUser() {
      try {
        if (!this.user?.uid) return
        const profile = await fetchUserProfile(this.user.uid)
        this.user = {
          ...(this.user || {}),
          ...profile,
          plan: profile?.plan || this.user?.plan,
          role: profile?.role || this.user?.role,
        }
      } catch {
        // no-op
      }
    },

    async refreshPlan(options = {}) {
      try {
        const uid = this.user?.uid
        if (!uid) return
        const force = options?.force === true
        const minIntervalMs = Number(options?.minIntervalMs ?? 15000)
        const now = Date.now()

        if (!force && this._refreshPlanPromise && this._refreshPlanUid === uid) {
          return this._refreshPlanPromise
        }

        if (
          !force &&
          this._lastPlanRefreshUid === uid &&
          this._lastPlanRefreshAt &&
          now - this._lastPlanRefreshAt < minIntervalMs
        ) {
          return this.user
        }

        this._refreshPlanUid = uid
        this._refreshPlanPromise = (async () => {
          let status = null
          let usage = null
          try {
            const [subStoreModule, usageResult] = await Promise.all([
              import('@/stores/subscriptionStore'),
              getUsageStatus(uid).catch(() => null),
            ])
            usage = usageResult
            try {
              status = await subStoreModule.useSubscriptionStore().fetchStatus(uid, {
                force,
                minIntervalMs,
              })
            } catch {}
          } catch {}

          const plan = String(status?.plan || this.user?.plan || 'free').toLowerCase()
          this.user = { ...(this.user || {}), plan, usage: usage || this.user?.usage }
          try {
            await updateDoc(doc(db, 'users', uid), { plan })
          } catch {}
          return this.user
        })()

        const result = await this._refreshPlanPromise
        this._lastPlanRefreshAt = Date.now()
        this._lastPlanRefreshUid = uid
        return result
      } catch {}
      finally {
        this._refreshPlanPromise = null
        this._refreshPlanUid = null
      }
    },

    async init() {
      const bootstrapTimeoutMs = isNativePackagedApp() ? 4000 : 7000
      const allowCachedSessionFallback = !isIosCapacitorApp()
      const allowNativeIosSnapshotRestore = isIosCapacitorApp()
      let restoredNativeIosSnapshot = false
      let bootstrapSettled = false
      let bootstrapTimer = null
      const settleBootstrap = (reason) => {
        if (bootstrapSettled) return
        bootstrapSettled = true
        this.loading = false
        try {
          if (bootstrapTimer) {
            clearTimeout(bootstrapTimer)
            bootstrapTimer = null
          }
        } catch {}
        try {
          console.info('[Auth] Bootstrap settled:', reason)
        } catch {}
      }

      try {
        if (allowNativeIosSnapshotRestore && !auth.currentUser) {
          try {
            const restored = await restoreNativeIosSessionFromSnapshot()
            if (restored?.user?.uid) {
              restoredNativeIosSnapshot = true
              const cachedUser = (() => {
                try {
                  return JSON.parse(localStorage.getItem('user') || 'null')
                } catch {
                  return null
                }
              })()
              this.user = {
                uid: restored.user.uid,
                displayName: restored.user.displayName || cachedUser?.displayName || restored.snapshot?.displayName || '',
                email: restored.user.email || cachedUser?.email || restored.snapshot?.email || '',
                photoURL: restored.user.photoURL || cachedUser?.photoURL || restored.snapshot?.photoUrl || '',
                role: cachedUser?.role || 'user',
              }
              this.token = restored.token || readStoredToken()
              this.guest = false
              localStorage.setItem('user', JSON.stringify(this.user))
              if (this.token) localStorage.setItem('token', this.token)
              console.info('[Auth] Restored native iOS session from local snapshot', {
                uid: restored.user.uid,
              })
              identifyUser(this.user)
              try {
                import('@/stores/workspaceStore').then((mod) => {
                  try { mod.useWorkspaceStore().init() } catch {}
                })
              } catch {}
              this.refreshPlan({ minIntervalMs: 15000 }).catch(() => {})
              settleBootstrap('ios-snapshot')
            }
          } catch (error) {
            console.warn('[Auth] Native iOS snapshot restore failed', {
              message: error?.message || String(error),
            })
            const looksInvalid =
              /invalid|expired|revoked|disabled|not found|malformed/i.test(String(error?.message || '')) ||
              /auth\//i.test(String(error?.code || ''))
            if (looksInvalid) clearNativeIosAuthSnapshot()
          }
        }
        if (!bootstrapSettled) {
          bootstrapTimer = window.setTimeout(() => {
            if (bootstrapSettled) return
            console.warn('[Auth] Bootstrap timed out; falling back to cached session or login screen')
            if (allowCachedSessionFallback) {
              try {
                const cachedUser = localStorage.getItem('user')
                const cachedToken = localStorage.getItem('token')
                if (!this.user && cachedUser && cachedToken) {
                  this.user = JSON.parse(cachedUser)
                  this.token = cachedToken
                  this.guest = false
                }
              } catch (e) {
                console.warn('[Auth] Bootstrap fallback restore failed', e)
              }
            }
            settleBootstrap('timeout')
          }, bootstrapTimeoutMs)
        }
      } catch {}

      // 🧩 Attempt fast bootstrap from local backup (helps iOS PWA)
      try {
        if (allowCachedSessionFallback) {
          const cachedUser = localStorage.getItem('user')
          const cachedToken = localStorage.getItem('token')
          if (!auth.currentUser && cachedUser && cachedToken) {
            this.user = JSON.parse(cachedUser)
            this.token = cachedToken
            this.guest = false
            console.log('[Auth] Restored session from local backup')
            settleBootstrap('local-backup')
          }
        }
      } catch (e) {
        console.warn('[Auth] Failed to restore local session', e)
      }

      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          const nativeSnapshot = isIosCapacitorApp() ? readNativeIosAuthSnapshot() : null
          const keepNativeSnapshotSession =
            isIosCapacitorApp() &&
            restoredNativeIosSnapshot &&
            !!this.user?.uid &&
            nativeSnapshot?.localId === this.user.uid

          if (!keepNativeSnapshotSession) {
            this.resetAuth()
          }
          settleBootstrap(keepNativeSnapshotSession ? 'auth-state:ios-snapshot' : 'auth-state:none')
          return
        }
        settleBootstrap('auth-state:user')
      })

      onIdTokenChanged(auth, async (user) => {
        try {
          if (!user) {
            const nativeSnapshot = isIosCapacitorApp() ? readNativeIosAuthSnapshot() : null
            const keepNativeSnapshotSession =
              isIosCapacitorApp() &&
              restoredNativeIosSnapshot &&
              !!this.user?.uid &&
              nativeSnapshot?.localId === this.user.uid
            if (keepNativeSnapshotSession) {
              settleBootstrap('id-token:ios-snapshot')
              return
            }
          }
          if (user) {
            const token = await withFallback(user.getIdToken(), {
              ms: 8000,
              label: 'bootstrap id token',
              fallback: () => readStoredToken(),
            })
            const profile = await withFallback(fetchUserProfile(user.uid), {
              ms: 8000,
              label: 'bootstrap profile fetch',
              fallback: { role: this.user?.role || 'user' },
            })
            this.user = {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              role: profile?.role || 'user',
            }
            this.token = token
            identifyUser(this.user)
            localStorage.setItem('user', JSON.stringify(this.user))
            if (this.token) localStorage.setItem('token', this.token)
            if (isIosCapacitorApp()) {
              persistNativeIosAuthSnapshot(buildNativeIosSnapshotFromFirebaseUser(user, this.token), this.user)
            }
            try {
              import('@/stores/workspaceStore').then((mod) => {
                try { mod.useWorkspaceStore().init() } catch {}
              })
            } catch {}
            // Live profile sync from Firestore (name/email/plan/etc.)
            try {
              if (this._profileUnsub) { this._profileUnsub(); this._profileUnsub = null }
              this._profileUnsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
                if (!snap.exists()) return
                const data = snap.data() || {}
                this.user = {
                  ...(this.user || {}),
                  ...data,
                  // prefer Firebase Auth displayName but fall back to profile name
                  displayName: this.user?.displayName || data.name || null,
                  email: this.user?.email || data.email || null,
                  photoURL: data.avatarUrl || this.user?.photoURL || null,
                }
                try { localStorage.setItem('user', JSON.stringify(this.user)) } catch {}
              })
            } catch {}
            try {
              if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
                const mod = await import('@/services/appTokenService.js')
                mod.refreshAppToken().catch(() => {})
              }
            } catch {}
            this.refreshPlan().catch(() => {})
          } else {
            this.resetAuth()
          }
          settleBootstrap(user ? 'id-token:user' : 'id-token:none')
        } catch (error) {
          if (isIosCapacitorApp() && (auth.currentUser || this.user)) {
            console.warn('[Auth] Native iOS id-token bootstrap failed; preserving hydrated session fallback', {
              message: error?.message || String(error),
              currentUid: auth.currentUser?.uid || this.user?.uid || null,
            })
            settleBootstrap('id-token:ios-fallback')
            return
          }
          this.resetAuth()
          settleBootstrap('id-token:error')
        }
      })

      // 🔁 Handle redirect sign-ins (Google fallback flow)
      try {
        await this.checkRedirectResult()
      } catch {}

      // 🧠 Silent token refresh to keep sessions alive in PWA contexts
      try {
        if (this._refreshTimer) clearInterval(this._refreshTimer)
        this._refreshTimer = setInterval(async () => {
          const user = auth.currentUser
          if (user) {
            try {
              const token = await withFallback(user.getIdToken(true), {
                ms: 8000,
                label: 'scheduled token refresh',
                fallback: () => readStoredToken(),
              })
              if (token) {
                this.token = token
                localStorage.setItem('token', token)
                if (isIosCapacitorApp() && auth.currentUser) {
                  persistNativeIosAuthSnapshot(buildNativeIosSnapshotFromFirebaseUser(auth.currentUser, token), this.user || {})
                }
              }
              // Optionally refresh long-lived app token if enabled and nearing expiry
              try {
                if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
                  const exp = parseInt(localStorage.getItem('app_token_exp') || '0', 10)
                  const soon = Date.now() + 24 * 60 * 60 * 1000 // within 24h
                  if (!exp || exp < soon) {
                    const mod = await import('@/services/appTokenService.js')
                    await mod.refreshAppToken().catch(() => {})
                  }
                }
              } catch {}
            } catch (err) {
              console.warn('[Auth] Token refresh failed', err)
            }
          } else {
            // Try to nudge a restore from backup when Firebase layer is null
            if (allowCachedSessionFallback) {
              try {
                const cachedUser = localStorage.getItem('user')
                const cachedToken = localStorage.getItem('token')
                if (!this.user && cachedUser && cachedToken) {
                  this.user = JSON.parse(cachedUser)
                  this.token = cachedToken
                }
              } catch {}
            }
          }
        }, 45 * 60 * 1000) // every 45 minutes
      } catch {}
    },

    async loginAsGuest() {
      this.loading = true
      try {
        const user = await signInAsGuest()
        const profile = await fetchUserProfile(user.uid)
        this.user = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          role: profile?.role || 'user',
        }
        this.guest = true
        this.token = await user.getIdToken()
        localStorage.setItem('user', JSON.stringify(this.user))
        localStorage.setItem('token', this.token)
        try {
          if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
            const mod = await import('@/services/appTokenService.js')
            mod.refreshAppToken().catch(() => {})
          }
        } catch {}
        ElNotification({
          title: 'Welcome ✨',
          message: 'Using guest mode. You can upgrade anytime.',
          type: 'success',
          duration: 2200,
          offset: 80,
        })
      } finally {
        this.loading = false
      }
    },

    // ✅ Fixed: Smart Google Login (Popup + Redirect Fallback)
    async loginWithGoogle() {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const current = auth.currentUser
      const alreadyLinked = (current?.providerData || []).some((p) => p?.providerId === 'google.com')

      if (isNativePackagedApp()) {
        const nativePlatform = Capacitor?.getPlatform?.() || 'web'
        this.loading = true
        try {
          if (supportsNativeGoogleRedirectBridge()) {
            if (current && !alreadyLinked) {
              const err = new Error('Google account linking inside the packaged Android app is not wired yet.')
              err.code = 'auth/native-google-link-unsupported'
              throw err
            }
            const redirectTarget = getPostLoginTarget()
            markNativeGoogleHandoffIntent(redirectTarget)
            console.info('[Auth] Android native bridge detected; starting Google redirect handoff', { redirectTarget })
            await signInWithRedirect(auth, provider)
            return
          }

          console.info('[Auth] Native iOS detected; using redirect Google sign-in', {
            platform: nativePlatform,
            linking: !!current && !alreadyLinked,
          })
          if (current && !alreadyLinked) {
            await linkWithRedirect(current, provider)
          } else {
            await signInWithRedirect(auth, provider)
          }
          return
        } catch (err) {
          if (supportsNativeGoogleRedirectBridge()) clearNativeGoogleHandoffIntent()
          this.loading = false
          throw err
        }
      }

      this.loading = true
      try {
        const isNative = !!Capacitor?.isNativePlatform?.()
        if (isNative) {
          console.info('[Auth] Native platform detected; using redirect Google sign-in', { linking: !!current && !alreadyLinked })
          if (current && !alreadyLinked) {
            await linkWithRedirect(current, provider)
          } else {
            await signInWithRedirect(auth, provider)
          }
          return
        }

        console.info('[Auth] Web platform detected; using popup Google sign-in', { linking: !!current && !alreadyLinked })

        // If already signed in (phone/email/guest), link Google to the current UID to avoid duplicates.
        if (current && !alreadyLinked) {
          try {
            const linkResult = await linkWithPopup(current, provider)
            const user = linkResult?.user || current
            await setDoc(
              doc(db, 'users', user.uid),
              {
                email: user.email,
                name: user.displayName || '',
                mode: 'google',
                lastLoginAt: Date.now(),
                profileComplete: !!(user.displayName),
              },
              { merge: true },
            )
            this.user = {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              role: this.user?.role || 'user',
            }
            this.guest = false
            this.token = await user.getIdToken()
            localStorage.setItem('user', JSON.stringify(this.user))
            localStorage.setItem('token', this.token)
            ElNotification({
              title: 'Google connected',
              message: 'Your Google account is now linked.',
              type: 'success',
              duration: 2200,
              offset: 80,
            })
            return user
          } catch (err) {
            const code = String(err?.code || '')
            if (code.includes('provider-already-linked')) {
              return current
            }
            // Do not fall through to sign-in while a session exists; avoids duplicate users.
            console.warn('[Auth] Google link failed; aborting sign-in to avoid duplicates', err?.message || err)
            throw err
          }
        }

        // Redirect is reserved for native builds; browsers stay on popup flow.
        if (isNative) {
          try {
            const ua = navigator.userAgent || ''
            const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone
            const isIOS = /iP(hone|ad|od)/i.test(ua)
            const isSafari = /safari/i.test(ua) && !/crios|fxios|fxios|edgios|chrome/i.test(ua)
            if (isStandalone || (isIOS && isSafari)) {
              await signInWithRedirect(auth, provider)
              return
            }
          } catch {}
        }

        // if (isInAppBrowser()) {
        //   console.warn('In-app browser detected — showing warning modal')
        //   // Dynamically mount the modal to DOM
        //   const container = document.createElement('div')
        //   document.body.appendChild(container)

        //   const { createApp } = await import('vue')
        //   const InAppBrowserWarning = (await import('@/components/InAppBrowserWarning.vue')).default

        //   const app = createApp(InAppBrowserWarning, {
        //     onContinue: async () => {
        //       try {
        //         app.unmount()
        //         document.body.removeChild(container)
        //         await signInWithRedirect(auth, provider)
        //       } catch (e) {
        //         console.error('Redirect failed:', e)
        //       }
        //     },
        //   })
        //   app.mount(container)

        //   return // Wait until modal resolves
        // }
        if (isNative && isInAppBrowser()) {
          console.warn('In-app browser detected — showing helper modal')
          const container = document.createElement('div')
          document.body.appendChild(container)

          const { createApp } = await import('vue')
          const InAppBrowserHelper = (await import('@/components/InAppBrowserWarning.vue')).default

          const app = createApp(InAppBrowserHelper, {
            redirectUrl: window.location.href,
            onContinue: async () => {
              app.unmount()
              document.body.removeChild(container)
              try {
                await signInWithRedirect(auth, provider)
              } catch (e) {
                console.error('Redirect failed:', e)
              }
            },
          })
          app.mount(container)
          return
        }

        // Default attempt: popup; be selective about redirect fallback.
        let user
        try {
          user = await signInWithGoogle()
        } catch (popupErr) {
          const code = String(popupErr?.code || '')
          const msg = String(popupErr?.message || '')
          const popupBlocked = code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request'
          const ua = navigator.userAgent || ''
          const isIOS = /iP(hone|ad|od)/i.test(ua)
          const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|chrome/i.test(ua)
          const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone
          const shouldTryRedirect = popupBlocked || isStandalone || (isIOS && isSafari)

          if (shouldTryRedirect && isNative) {
            console.warn('[Auth] Popup sign-in blocked/unavailable; trying redirect instead', { code, msg })
            try {
              await signInWithRedirect(auth, provider)
              return
            } catch (redirErr) {
              console.error('[Auth] Redirect sign-in also failed', redirErr)
              throw redirErr
            }
          }

          // Do not auto-redirect for other failures (e.g., storage partitioning).
          // Surface the error so the UI can suggest trying a non-private window.
          throw popupErr
        }
        const profile = await fetchUserProfile(user.uid)
        this.user = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          role: profile?.role || 'user',
        }
        this.guest = false
        this.token = await user.getIdToken()
        localStorage.setItem('user', JSON.stringify(this.user))
        localStorage.setItem('token', this.token)
        ElNotification({
          title: 'Welcome back ✨',
          message: `Signed in as ${this.user.displayName || this.user.email || 'User'}`,
          type: 'success',
          duration: 2500,
          offset: 80,
        })
      } finally {
        this.loading = false
      }
    },

    // 🍎 Sign in with Apple (iOS-only button will call this)
    async loginWithApple() {
      if (isNativePackagedApp()) {
        const err = new Error(getNativeAuthRestriction('apple'))
        err.code = 'auth/native-apple-unsupported'
        throw err
      }
      this.loading = true
      try {
        const provider = new OAuthProvider('apple.com')
        provider.addScope('email')
        provider.addScope('name')

        const shouldRedirect = (() => {
          if (isIosCapacitorApp()) return true
          const ua = navigator.userAgent || ''
          const isIOS = /iP(hone|ad|od)/i.test(ua)
          const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|chrome/i.test(ua)
          const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone
          return isIOS || isSafari || isStandalone
        })()

        const current = auth.currentUser
        const alreadyLinked = (current?.providerData || []).some((p) => p?.providerId === 'apple.com')
        if (alreadyLinked) {
          ElNotification({
            title: 'Apple already connected',
            message: 'Your Apple account is already linked.',
            type: 'info',
            duration: 2000,
            offset: 80,
          })
          return current
        }

        let result = null
        if (current) {
          try {
            result = await linkWithPopup(current, provider)
          } catch (err) {
            const code = String(err?.code || '')
            const popupIssues = code.includes('popup') || code === 'auth/operation-not-supported-in-this-environment'
            if (shouldRedirect && popupIssues) {
              await linkWithRedirect(current, provider)
              return
            }
            console.warn('[Auth] Apple link failed; aborting to avoid duplicate accounts', err)
            throw err
          }
        } else {
          try {
            result = await signInWithPopup(auth, provider)
          } catch (err) {
            const code = String(err?.code || '')
            const popupIssues = code.includes('popup') || code === 'auth/operation-not-supported-in-this-environment'
            if (shouldRedirect && popupIssues) {
              await signInWithRedirect(auth, provider)
              return
            }
            throw err
          }
        }

        const user = result?.user
        if (!user?.uid) throw new Error('Apple sign-in failed')

        await setDoc(
          doc(db, 'users', user.uid),
          {
            email: user.email || null,
            name: user.displayName || '',
            mode: 'apple',
            lastLoginAt: Date.now(),
            profileComplete: !!(user.displayName),
          },
          { merge: true },
        )

        const profile = await fetchUserProfile(user.uid)
        this.user = {
          uid: user.uid,
          displayName: user.displayName || profile?.name || '',
          email: user.email || profile?.email || null,
          photoURL: user.photoURL || null,
          role: profile?.role || this.user?.role || 'user',
        }
        this.guest = false
        this.token = await user.getIdToken()
        localStorage.setItem('user', JSON.stringify(this.user))
        localStorage.setItem('token', this.token)
        try {
          if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
            const mod = await import('@/services/appTokenService.js')
            mod.refreshAppToken().catch(() => {})
          }
        } catch {}
        this.refreshPlan().catch(() => {})
        ElNotification({
          title: current ? 'Apple linked' : 'Welcome back ✨',
          message: current ? 'Apple has been added to your account.' : `Signed in as ${this.user.displayName || this.user.email || 'User'}`,
          type: 'success',
          duration: 2400,
          offset: 80,
        })
        return user
      } finally {
        this.loading = false
      }
    },

    // ✅ Handles post-redirect Google login
    async checkRedirectResult() {
      try {
        const result = await getRedirectResult(auth)
        if (result && result.user) {
          const user = result.user
          try {
            const providerId = result?.providerId || (result?.user?.providerData || [])[0]?.providerId
            const mode = providerId === 'apple.com' ? 'apple' : providerId === 'google.com' ? 'google' : null
            if (mode) {
              await setDoc(
                doc(db, 'users', user.uid),
                {
                  email: user.email,
                  name: user.displayName || '',
                  mode,
                  lastLoginAt: Date.now(),
                  profileComplete: !!(user.displayName),
                },
                { merge: true },
              )
            }
          } catch (profileErr) {
            console.warn('[Auth] Failed to upsert profile after redirect', profileErr)
          }
          const profile = await fetchUserProfile(user.uid)
          this.user = {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            role: profile?.role || 'user',
          }
          this.guest = false
          this.token = await user.getIdToken()
          localStorage.setItem('user', JSON.stringify(this.user))
          localStorage.setItem('token', this.token)
          try {
            if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
              const mod = await import('@/services/appTokenService.js')
              mod.refreshAppToken().catch(() => {})
            }
          } catch {}
          ElNotification({
            title: 'Welcome back ✨',
            message: `Signed in as ${this.user.displayName || this.user.email || 'User'}`,
            type: 'success',
            duration: 2500,
            offset: 80,
          })

          const params = new URLSearchParams(window.location.search)
          const nativeHandoff = params.get('native_handoff')
          const nativeProvider = params.get('native_provider') || 'google'
          const nativeRedirect = normalizeRedirectPath(
            params.get('native_redirect') ||
            localStorage.getItem('postLoginRedirect') ||
            params.get('redirect') ||
            '/dashboard',
          )

          if (!isNativePackagedApp() && nativeHandoff === 'android-google' && nativeProvider === 'google') {
            try {
              const handoff = await createMobileAuthHandoff({
                redirect: nativeRedirect,
                platform: 'android',
                provider: 'google',
              })
              clearNativeGoogleHandoffIntent()
              window.location.replace(
                buildNativeAuthCallbackUrl({
                  code: handoff?.code,
                  redirect: handoff?.redirect || nativeRedirect,
                }),
              )
              return
            } catch (handoffErr) {
              console.error('[Auth] Failed to create Android mobile handoff', handoffErr)
            }
          }

          // After a successful redirect sign‑in, navigate away from /login to
          // prevent a stuck screen. Prefer an explicit redirect param or any
          // stored intent; otherwise fall back to dashboard.
          try {
            // 1) stored intent set by guards
            const stored = localStorage.getItem('postLoginRedirect')
            if (stored) {
              localStorage.removeItem('postLoginRedirect')
              window.location.replace(normalizeRedirectPath(stored))
              return
            }
            // 2) redirect query param
            const q = params.get('redirect')
            if (q) {
              window.location.replace(normalizeRedirectPath(q))
              return
            }
            // 3) default
            if (window.location.pathname === '/login') {
              window.location.replace('/dashboard')
            }
          } catch {}
        }
      } catch (err) {
        console.warn('Redirect sign-in restore failed:', err)
      }
    },

    async completeNativeAuthHandoff(code, redirectTarget = '/dashboard') {
      this.loading = true
      try {
        const handoff = await consumeMobileAuthHandoff(code)
        const customToken = String(handoff?.customToken || '')
        if (!customToken) throw new Error('Missing Firebase custom token for native handoff')

        const credential = await signInWithCustomToken(auth, customToken)
        const user = credential?.user
        if (!user?.uid) throw new Error('Native handoff did not return a Firebase user')

        const profile = await fetchUserProfile(user.uid)
        this.user = {
          uid: user.uid,
          displayName: user.displayName || profile?.name || '',
          email: user.email || profile?.email || null,
          photoURL: user.photoURL || null,
          role: profile?.role || 'user',
        }
        this.guest = false
        this.token = await user.getIdToken(true)
        identifyUser(this.user)
        localStorage.setItem('user', JSON.stringify(this.user))
        localStorage.setItem('token', this.token)
        try {
          if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
            const mod = await import('@/services/appTokenService.js')
            mod.refreshAppToken().catch(() => {})
          }
        } catch {}
        this.refreshPlan().catch(() => {})
        ElNotification({
          title: 'Welcome back ✨',
          message: `Signed in as ${this.user.displayName || this.user.email || 'User'}`,
          type: 'success',
          duration: 2500,
          offset: 80,
        })
        return {
          redirect: normalizeRedirectPath(
            redirectTarget || handoff?.redirect || localStorage.getItem('postLoginRedirect') || '/dashboard',
          ),
        }
      } finally {
        this.loading = false
      }
    },

    // 📱 Phone OTP: send code
    async sendPhoneOtp(phone, recaptchaVerifier) {
      if (isNativePackagedApp()) {
        const err = new Error(getNativeAuthRestriction('phone'))
        err.code = 'auth/native-phone-unsupported'
        throw err
      }
      if (!phone) throw new Error('Missing phone number')
      if (!recaptchaVerifier) throw new Error('Missing reCAPTCHA verifier')
      // Use Firebase auth directly for OTP
      return await signInWithPhoneNumber(auth, phone, recaptchaVerifier)
    },

    // 📱 Phone OTP: confirm code and finalize login
    async confirmPhoneOtp(confirmationResult, otp) {
      if (!confirmationResult) throw new Error('Missing confirmation result')
      if (!otp) throw new Error('Missing OTP code')
      this.loading = true
      try {
        const current = auth.currentUser
        const alreadyLinked = (current?.providerData || []).some((p) => p?.providerId === 'phone')

        let user = null
        if (current && !alreadyLinked) {
          // Link phone credential to existing session to avoid duplicate UIDs.
          const verificationId = confirmationResult?.verificationId
          if (!verificationId) throw new Error('Missing verification id')
          const cred = PhoneAuthProvider.credential(verificationId, otp)
          try {
            const linkRes = await linkWithCredential(current, cred)
            user = linkRes?.user || current
          } catch (err) {
            const code = String(err?.code || '')
            if (
              code === 'auth/credential-already-in-use' ||
              code === 'auth/account-exists-with-different-credential'
            ) {
              const signInRes = await signInWithCredential(auth, cred)
              user = signInRes?.user
            } else {
              throw err
            }
          }
        } else {
          const result = await confirmationResult.confirm(otp)
          user = result?.user
        }
        if (!user?.uid) throw new Error('Phone sign-in failed')

        // Ensure Firestore profile exists/updated
        try {
          await setDoc(
            doc(db, 'users', user.uid),
            {
              phone: user.phoneNumber || null,
              mode: 'phone',
              lastLoginAt: Date.now(),
              createdAt: Date.now(),
              profileComplete: false,
            },
            { merge: true },
          )
        } catch {}

        // Mirror other login flows
        const profile = await fetchUserProfile(user.uid)
        this.user = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          role: profile?.role || 'user',
          phone: user.phoneNumber || profile?.phone || undefined,
        }
        this.guest = false
        this.token = await user.getIdToken()
        localStorage.setItem('user', JSON.stringify(this.user))
        localStorage.setItem('token', this.token)
        try {
          if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
            const mod = await import('@/services/appTokenService.js')
            mod.refreshAppToken().catch(() => {})
          }
        } catch {}
        this.refreshPlan().catch(() => {})
        ElNotification({
          title: 'Welcome ✨',
          message: `Signed in with phone ${this.user.phone || ''}`,
          type: 'success',
          duration: 2400,
          offset: 80,
        })
        return user
      } finally {
        this.loading = false
      }
    },

    async loginWithEmail(email, password) {
      this.loading = true
      try {
        const current = auth.currentUser
        const alreadyLinked = (current?.providerData || []).some((p) => p?.providerId === 'password')
        const canFallbackGuestLink =
          current?.isAnonymous === true || this.guest === true || this.user?.mode === 'guest'
        const useNativeIosDirectEmail = isNativePackagedApp() && isIosCapacitorApp()
        console.info('[Auth] Email login start', {
          email,
          platform: Capacitor?.getPlatform?.() || 'web',
          native: isNativePackagedApp(),
          online: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
          origin: typeof window !== 'undefined' ? window.location.origin : 'server',
          currentUid: current?.uid || null,
          currentAnonymous: current?.isAnonymous === true,
          providerIds: (current?.providerData || []).map((p) => p?.providerId).filter(Boolean),
          authDomain: auth?.app?.options?.authDomain || null,
        })

        if (useNativeIosDirectEmail) {
          console.info('[Auth] Native iOS email login via Identity Toolkit + custom token exchange', {
            email,
            currentUid: current?.uid || null,
            currentAnonymous: current?.isAnonymous === true,
          })

          const session = await nativeIosPasswordSignIn(email, password)
          console.info('[Auth] Native iOS password verification resolved', {
            uid: session?.localId || null,
          })

          const exchanged = await exchangeNativeSessionForCustomToken(session.idToken, 'password', 'ios')
          const customToken = String(exchanged?.customToken || '')
          console.info('[Auth] Native iOS custom token exchange resolved', {
            uid: exchanged?.uid || session?.localId || null,
          })

          const tokenSession = await nativeIosSignInWithCustomToken(customToken)
          console.info('[Auth] Native iOS Identity Toolkit custom token sign-in resolved', {
            uid: tokenSession?.localId || null,
          })
          persistNativeIosAuthSnapshot(tokenSession, {
            email,
            displayName: session?.displayName || '',
            photoUrl: session?.profilePicture || session?.photoUrl || '',
          })

          const user = await hydrateNativeIosCustomTokenUser(tokenSession, email)
          console.info('[Auth] Native iOS auth state hydrated from custom token', {
            uid: user?.uid || null,
            hasCurrentUser: !!auth.currentUser,
            currentUid: auth.currentUser?.uid || null,
          })

          if (!user?.uid) {
            throw new Error('Native iOS custom token sign-in did not return a Firebase user')
          }

          this.user = {
            uid: user.uid,
            displayName: user.displayName || session?.displayName || '',
            email: user.email || session?.email || email,
            photoURL: user.photoURL,
            role: 'user',
          }
          this.guest = false
          this.token = await withFallback(user.getIdToken(), {
            ms: 8000,
            label: 'native iOS email sign-in token',
            fallback: () => session?.idToken || readStoredToken(),
          })
          localStorage.setItem('user', JSON.stringify(this.user))
          if (this.token) localStorage.setItem('token', this.token)
          persistNativeIosAuthSnapshot(buildNativeIosSnapshotFromFirebaseUser(user, this.token), this.user)
          try {
            setDoc(
              doc(db, 'users', user.uid),
              {
                email: this.user.email,
                name: this.user.displayName || '',
                mode: 'email',
                lastLoginAt: Date.now(),
                ...(this.user.displayName ? { profileComplete: true } : {}),
              },
              { merge: true },
            ).catch((err) => {
              console.warn('[Auth] Deferred native iOS email profile sync failed', err)
            })
          } catch {}
          Promise.resolve()
            .then(() => withTimeout(fetchUserProfile(user.uid), 5000, 'native iOS email profile fetch'))
            .then((profile) => {
              this.user = {
                ...(this.user || {}),
                role: profile?.role || this.user?.role || 'user',
              }
              try { localStorage.setItem('user', JSON.stringify(this.user)) } catch {}
            })
            .catch(() => {
              this.user = {
                ...(this.user || {}),
                role: this.user?.role || 'user',
              }
              try { localStorage.setItem('user', JSON.stringify(this.user)) } catch {}
            })
          try {
            if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
              const mod = await import('@/services/appTokenService.js')
              mod.refreshAppToken().catch(() => {})
            }
          } catch {}
          this.refreshPlan().catch(() => {})
          ElNotification({
            title: 'Signed in ✨',
            message: `Welcome ${this.user.displayName || this.user.email || ''}`,
            type: 'success',
            duration: 2200,
            offset: 80,
          })
          return user
        }

        if (current && !alreadyLinked) {
          // Link email/password to current session; abort on failure to avoid duplicate UIDs.
          const credential = EmailAuthProvider.credential(email, password)
          try {
            console.info('[Auth] Email login using linkWithCredential for current session', {
              currentUid: current.uid,
              currentAnonymous: current?.isAnonymous === true,
            })
            const linkRes = await withTimeout(
              linkWithCredential(current, credential),
              12000,
              'email link credential',
            )
            console.info('[Auth] linkWithCredential resolved', {
              linkedUid: linkRes?.user?.uid || current?.uid || null,
            })
            const user = linkRes?.user || current
            this.user = {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              role: this.user?.role || 'user',
            }
            this.guest = false
            this.token = await withFallback(user.getIdToken(), {
              ms: 8000,
              label: 'email link token',
              fallback: () => readStoredToken(),
            })
            localStorage.setItem('user', JSON.stringify(this.user))
            if (this.token) localStorage.setItem('token', this.token)
            try {
              setDoc(
                doc(db, 'users', user.uid),
                {
                  email: user.email,
                  name: user.displayName || '',
                  mode: 'email',
                  lastLoginAt: Date.now(),
                  profileComplete: !!(user.displayName),
                },
                { merge: true },
              ).catch((err) => {
                console.warn('[Auth] Deferred email link profile sync failed', err)
              })
            } catch {}
            withFallback(fetchUserProfile(user.uid), {
              ms: 8000,
              label: 'email link profile fetch',
              fallback: { role: this.user?.role || 'user' },
            }).then((profile) => {
              this.user = {
                ...(this.user || {}),
                role: profile?.role || this.user?.role || 'user',
              }
              try { localStorage.setItem('user', JSON.stringify(this.user)) } catch {}
            }).catch(() => {})
            try {
              if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
                const mod = await import('@/services/appTokenService.js')
                mod.refreshAppToken().catch(() => {})
              }
            } catch {}
            this.refreshPlan().catch(() => {})
            ElNotification({
              title: 'Email linked',
              message: 'Email/password added to your account.',
              type: 'success',
              duration: 2200,
              offset: 80,
            })
            return user
          } catch (error) {
            console.error('[Auth] Email link credential failed', {
              code: error?.code || null,
              message: error?.message || String(error),
            })
            const code = String(error?.code || '')
            const canFallbackToSignIn =
              canFallbackGuestLink &&
              (
                code === 'auth/email-already-in-use' ||
                code === 'auth/credential-already-in-use' ||
                code === 'auth/account-exists-with-different-credential'
              )
            if (!canFallbackToSignIn) throw error
            console.info('[Auth] Existing email account detected during guest link; falling back to direct sign-in')
          }
        }

        // No active session or already linked: standard sign-in.
        console.info('[Auth] Calling signInWithEmailAndPassword', {
          email,
          hasCurrentUser: !!auth.currentUser,
        })
        const cred = await withTimeout(
          signInWithEmailAndPassword(auth, email, password),
        12000,
        'email sign-in',
      )
      console.info('[Auth] signInWithEmailAndPassword resolved', {
        uid: cred?.user?.uid || null,
      })
      const user = cred.user
      this.user = {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        role: 'user',
      }
      this.guest = false
      this.token = await withFallback(user.getIdToken(), {
        ms: 8000,
        label: 'email sign-in token',
        fallback: () => readStoredToken(),
      })
      localStorage.setItem('user', JSON.stringify(this.user))
      if (this.token) localStorage.setItem('token', this.token)
      try {
        setDoc(
          doc(db, 'users', user.uid),
          {
            email: user.email,
            name: user.displayName || '',
            mode: 'email',
            lastLoginAt: Date.now(),
            ...(user.displayName ? { profileComplete: true } : {}),
          },
          { merge: true },
        ).catch((err) => {
          console.warn('[Auth] Deferred email profile sync failed', err)
        })
      } catch {}
      withFallback(fetchUserProfile(user.uid), {
        ms: 8000,
        label: 'email profile fetch',
        fallback: { role: 'user' },
      }).then((profile) => {
        this.user = {
          ...(this.user || {}),
          role: profile?.role || this.user?.role || 'user',
        }
        try { localStorage.setItem('user', JSON.stringify(this.user)) } catch {}
      }).catch(() => {})
      try {
        if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
          const mod = await import('@/services/appTokenService.js')
          mod.refreshAppToken().catch(() => {})
        }
      } catch {}
      this.refreshPlan().catch(() => {})
      ElNotification({
        title: 'Signed in ✨',
        message: `Welcome ${this.user.displayName || this.user.email || ''}`,
        type: 'success',
        duration: 2400,
        offset: 80,
      })
      console.info('[Auth] Email login completed', {
        uid: this.user?.uid || null,
        email: this.user?.email || null,
      })
    } catch (error) {
      console.error('[Auth] Email login failed', {
        code: error?.code || null,
        message: error?.message || String(error),
      })
      throw error
    } finally {
      this.loading = false
    }
  },

    async registerEmail(email, password) {
      this.loading = true
      try {
        const user = await registerWithEmail(email, password)
        const profile = await fetchUserProfile(user.uid)
        this.user = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          role: profile?.role || 'user',
        }
        this.guest = false
        this.token = await user.getIdToken()
        localStorage.setItem('user', JSON.stringify(this.user))
        localStorage.setItem('token', this.token)
        try {
          if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
            const mod = await import('@/services/appTokenService.js')
            mod.refreshAppToken().catch(() => {})
          }
        } catch {}
        ElNotification({
          title: 'Account created 🎉',
          message: `Hi ${this.user.email || 'there'}!`,
          type: 'success',
          duration: 2600,
          offset: 80,
        })
      } finally {
        this.loading = false
      }
    },

    async resetPassword(email) {
      await sendResetEmail(email)
    },

    async logout() {
      try {
        await withTimeout(signOutUser(), isIosCapacitorApp() ? 5000 : 8000, 'logout sign-out')
      } catch (e) {
        console.warn('Sign-out failed:', e)
      } finally {
        ElNotification({
          title: 'Signed out 👋',
          message: 'You have successfully logged out.',
          type: 'info',
          duration: 1600,
          offset: 80,
        })
        try {
          trackEvent('Logout')
        } catch {}
        this.resetAuth()
        setTimeout(() => {
          try {
            window.location.replace('/login')
          } catch {}
        }, 350)
      }
    },
  },

  getters: {
    isLoggedIn: (state) => !!state.user,
    isGuest: (state) => state.guest === true,
  },
})

// Placeholder shim (for older views)
export const userPrefs = undefined

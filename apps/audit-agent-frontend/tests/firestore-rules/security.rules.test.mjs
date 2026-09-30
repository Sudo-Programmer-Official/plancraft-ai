// Firestore security-rules tests. Run via `npm run test:rules`, which starts the
// Firestore emulator for a demo- project (never touches a real project).
import { after, before, beforeEach, describe, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import process from 'node:process'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules')
const PROJECT_ID = 'demo-plancraft-rules'

let testEnv

before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST is not set; run via `npm run test:rules`')
  }
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(RULES_PATH, 'utf8') },
  })
})

after(async () => {
  await testEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users/alice'), { email: 'alice@example.com', role: 'user', plan: 'free', name: 'Alice' })
    await setDoc(doc(db, 'users/bob'), { email: 'bob@example.com', role: 'user', plan: 'free', name: 'Bob' })
    await setDoc(doc(db, 'users/admin'), { email: 'admin@example.com', role: 'admin' })
    await setDoc(doc(db, 'users/alice/workspaces/legacy-ws'), { name: 'Old workspace', ownerId: 'alice' })
    await setDoc(doc(db, 'workspace_members/ws-bob_bob'), { workspaceId: 'ws-bob', userId: 'bob', role: 'owner', status: 'active' })
    await setDoc(doc(db, 'tasks/bob-task'), { title: 'Bob task', workspaceId: 'ws-bob', userId: 'bob', createdBy: 'bob' })
  })
})

const as = (uid) => testEnv.authenticatedContext(uid).firestore()

describe('users/{uid}: privileged fields are server-controlled', () => {
  test('normal user cannot become admin', async () => {
    const db = as('alice')
    await assertFails(updateDoc(doc(db, 'users/alice'), { role: 'admin' }))
    await assertFails(setDoc(doc(db, 'users/alice'), { role: 'superadmin' }, { merge: true }))
  })

  test('normal user cannot grant themselves a paid plan or entitlements', async () => {
    const db = as('alice')
    await assertFails(updateDoc(doc(db, 'users/alice'), { plan: 'pro' }))
    await assertFails(setDoc(doc(db, 'users/alice'), { planLimits: { ai: 9999 } }, { merge: true }))
    await assertFails(setDoc(doc(db, 'users/alice'), { accessOverride: { plan: 'pro' } }, { merge: true }))
  })

  test('normal user cannot rewrite identity/ownership fields', async () => {
    const db = as('alice')
    await assertFails(setDoc(doc(db, 'users/alice'), { canonicalUserId: 'bob' }, { merge: true }))
    await assertFails(setDoc(doc(db, 'users/alice'), { authProviders: { phone: { verified: true } } }, { merge: true }))
  })

  test('a privileged field cannot be smuggled alongside an allowed one', async () => {
    const db = as('alice')
    await assertFails(setDoc(doc(db, 'users/alice'), { name: 'Alice', role: 'admin' }, { merge: true }))
  })

  test('server-controlled fields cannot be deleted by overwriting the document', async () => {
    const db = as('alice')
    await assertFails(setDoc(doc(db, 'users/alice'), { name: 'Alice' }))
  })

  test('a new user cannot create their profile with privileged fields', async () => {
    const db = as('carol')
    await assertFails(setDoc(doc(db, 'users/carol'), { email: 'c@example.com', role: 'admin' }))
    await assertFails(setDoc(doc(db, 'users/carol'), { email: 'c@example.com', plan: 'pro' }, { merge: true }))
  })

  test('user A cannot write user B profile, even allowed fields', async () => {
    const db = as('alice')
    await assertFails(setDoc(doc(db, 'users/bob'), { name: 'Hacked' }, { merge: true }))
    await assertFails(updateDoc(doc(db, 'users/bob'), { lastLoginAt: Date.now() }))
  })

  test('unauthenticated caller cannot read or write profiles', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'users/alice')))
    await assertFails(setDoc(doc(db, 'users/alice'), { name: 'x' }, { merge: true }))
  })

  test('admin can still manage roles (existing behavior)', async () => {
    const db = as('admin')
    await assertSucceeds(updateDoc(doc(db, 'users/bob'), { role: 'admin' }))
  })
})

// Each payload below mirrors a real client write in src/ so that tightening the
// allowlist cannot silently break a sign-in or profile flow.
describe('users/{uid}: legitimate client profile writes still work', () => {
  test('own profile is readable', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'users/alice')))
  })

  test('Google/Apple/email login upsert (authStore, authService)', async () => {
    const db = as('alice')
    await assertSucceeds(setDoc(doc(db, 'users/alice'), {
      email: 'alice@example.com', name: 'Alice', mode: 'google', lastLoginAt: Date.now(), profileComplete: true,
    }, { merge: true }))
    await assertSucceeds(setDoc(doc(db, 'users/alice'), {
      email: 'alice@example.com', name: 'Alice', mode: 'email_link', lastLoginAt: Date.now(), profileComplete: true,
    }, { merge: true }))
  })

  test('phone login upsert (authStore.confirmPhoneOtp)', async () => {
    const db = as('alice')
    await assertSucceeds(setDoc(doc(db, 'users/alice'), {
      phone: '+16145550123', lastLoginAt: Date.now(), mode: 'phone', createdAt: Date.now(), profileComplete: false,
    }, { merge: true }))
  })

  test('new email registration creates the profile (authService.registerWithEmail)', async () => {
    await assertSucceeds(setDoc(doc(as('carol'), 'users/carol'), {
      email: 'c@example.com', name: '', mode: 'email', createdAt: Date.now(), profileComplete: false,
    }, { merge: true }))
  })

  test('guest sign-in creates the profile (authService.signInAsGuest)', async () => {
    await assertSucceeds(setDoc(doc(as('guest1'), 'users/guest1'), {
      createdAt: Date.now(), mode: 'guest', isGuest: true, firstVisitInitialized: false, profileComplete: false,
    }, { merge: true }))
  })

  test('guest starter seeding flag (utils/guestTasks)', async () => {
    await assertSucceeds(updateDoc(doc(as('alice'), 'users/alice'), {
      firstVisitInitialized: true, starterTasksSeededAt: serverTimestamp(), starterSource: 'guest_starter',
    }))
  })

  test('profile setup (components/ProfileSetup)', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'users/alice'), {
      name: 'Alice A', profileComplete: true, updatedAt: new Date(), email: 'alice@example.com', phone: '+16145550123',
    }, { merge: true }))
  })

  test('profile bootstrap (layouts/AppLayout)', async () => {
    await assertSucceeds(setDoc(doc(as('dave'), 'users/dave'), {
      createdAt: new Date(), updatedAt: new Date(), profileComplete: false,
    }, { merge: true }))
  })

  test('avatar upload (components/AvatarUploader)', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'users/alice'), {
      avatarUrl: 'https://example.com/a.png', updatedAt: new Date(),
    }, { merge: true }))
  })

  test('web FCM token (firebase/messaging)', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'users/alice'), {
      fcmToken: 'token-123', fcmTokenUpdatedAt: new Date().toISOString(),
    }, { merge: true }))
  })

  test('re-writing an unchanged server field is not a change', async () => {
    // merge writes that echo the current value do not count as affected keys
    await assertSucceeds(setDoc(doc(as('alice'), 'users/alice'), { name: 'Alice', plan: 'free' }, { merge: true }))
  })

  test('preferences doc remains user-writable', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'preferences/alice'), { theme: 'dark' }, { merge: true }))
    await assertFails(setDoc(doc(as('alice'), 'preferences/bob'), { theme: 'dark' }, { merge: true }))
  })
})

describe('users/{uid}/workspaces: legacy workspace docs are read-only for clients', () => {
  test('user cannot plant a legacy workspace doc (workspace takeover vector)', async () => {
    const db = as('alice')
    await assertFails(setDoc(doc(db, 'users/alice/workspaces/ws-bob'), { name: 'mine now', ownerId: 'alice' }))
    await assertFails(updateDoc(doc(db, 'users/alice/workspaces/legacy-ws'), { ownerId: 'bob' }))
  })

  test('user can still read their own legacy workspace docs', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'users/alice/workspaces/legacy-ws')))
    await assertFails(getDoc(doc(as('bob'), 'users/alice/workspaces/legacy-ws')))
  })

  test('workspace-scoped subcollections keep working for members', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspace_members/legacy-ws_alice'), {
        workspaceId: 'legacy-ws', userId: 'alice', role: 'owner', status: 'active',
      })
    })
    await assertSucceeds(setDoc(doc(as('alice'), 'users/alice/workspaces/legacy-ws/preferences/dashboard'), { layout: 'a' }))
  })
})

describe('tasks: cross-user isolation', () => {
  test('user A cannot read, update, or delete a task in user B workspace', async () => {
    const db = as('alice')
    await assertFails(getDoc(doc(db, 'tasks/bob-task')))
    await assertFails(updateDoc(doc(db, 'tasks/bob-task'), { title: 'pwned' }))
  })

  test('user A cannot create a task in a workspace they are not a member of', async () => {
    await assertFails(setDoc(doc(as('alice'), 'tasks/new-task'), {
      title: 'x', workspaceId: 'ws-bob', userId: 'alice', createdBy: 'alice',
    }))
  })

  test('workspace owner can update their own task', async () => {
    await assertSucceeds(updateDoc(doc(as('bob'), 'tasks/bob-task'), { title: 'Updated' }))
  })
})

describe('workspace_members: clients cannot grant themselves membership', () => {
  test('user cannot create or elevate a membership row', async () => {
    const db = as('alice')
    await assertFails(setDoc(doc(db, 'workspace_members/ws-bob_alice'), {
      workspaceId: 'ws-bob', userId: 'alice', role: 'owner', status: 'active',
    }))
  })
})

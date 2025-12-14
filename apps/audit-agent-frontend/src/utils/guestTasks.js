import { addTaskToFirebase } from '@/services/firebaseService'
import { toLocalDateKey } from '@/utils/dateHelper'
import { db } from '@/firebase/init'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'

const BASE_TEMPLATES = [
  {
    key: 'plan',
    title: 'Plan your day 📅',
    details: 'Open the planner and map your top 3 priorities. Drag to reorder when energy shifts.',
    category: 'Planning',
  },
  {
    key: 'voice',
    title: 'Try speaking to the planner 🎙️',
    details: 'Use Talk to Planner for a voice brain dump — I’ll capture follow-ups automatically.',
    category: 'Voice Capture',
  },
  {
    key: 'journal',
    title: 'Write your first journal entry ✍️',
    details: 'Reflect for two minutes. Jot what feels heavy vs. energizing so I can adapt nudges.',
    category: 'Reflection',
  },
]

function buildPersonalizedTemplates(options = {}) {
  const { focus, reminderTone, energyRhythm, intentionNote } = options
  const tasks = [...BASE_TEMPLATES]

  if (focus === 'accountability') {
    tasks.push({
      key: 'accountability',
      title: 'Set a gentle accountability check 🔔',
      details: 'Turn on a reminder via WhatsApp/Text so I can check in when you need it most.',
      category: 'Accountability',
    })
  } else if (focus === 'reflection') {
    tasks.push({
      key: 'reflection',
      title: 'Capture tonight’s wins 🌙',
      details: 'Add an evening reflection prompt so tomorrow’s energy starts clear.',
      category: 'Reflection',
    })
  }

  if (energyRhythm === 'morning') {
    tasks.push({
      key: 'energy',
      title: 'Block a calm morning focus slot 🌅',
      details: 'Guard 60 minutes for deep work before your day gets noisy.',
      category: 'Energy',
    })
  } else if (energyRhythm === 'evening') {
    tasks.push({
      key: 'evening',
      title: 'Schedule an evening reset 🌙',
      details: 'Use the planner to note tomorrow’s first task so you can log off peacefully.',
      category: 'Evening',
    })
  }

  if (intentionNote?.trim()) {
    tasks.push({
      key: 'intention',
      title: 'Honor your intention 💜',
      details: intentionNote.trim(),
      category: 'Mindful Intention',
    })
  }

  return tasks
}

function getLocalSeedKey(uid) {
  return `pcai_guest_seed_${uid}`
}

function getLocalSeedState(uid) {
  try {
    return localStorage.getItem(getLocalSeedKey(uid))
  } catch {
    return null
  }
}

function setLocalSeedState(uid, value) {
  try {
    localStorage.setItem(getLocalSeedKey(uid), value)
  } catch {
    /* noop */
  }
}

function clearLocalSeedState(uid) {
  try {
    localStorage.removeItem(getLocalSeedKey(uid))
  } catch {
    /* noop */
  }
}

export async function seedGuestStarterTasks(uid, options = {}) {
  if (!uid) return { created: 0 }

  const force = options.force === true
  if (!force) {
    const localSeed = getLocalSeedState(uid)
    if (localSeed === '1' || localSeed === 'pending') {
      return { created: 0, skipped: true }
    }
  }

  setLocalSeedState(uid, 'pending')

  const today = toLocalDateKey(new Date())
  const personalized = buildPersonalizedTemplates(options)
  let created = 0

  for (const [index, template] of personalized.entries()) {
    try {
      await addTaskToFirebase({
        title: template.title,
        details: template.details,
        category: template.category,
        completed: false,
        date: today,
        order: -1 * (index + 1),
        source: options.source || 'guest_starter',
        metadata: {
          starter: true,
          guestSeed: true,
          templateKey: template.key,
          focusPreference: options.focus || null,
          reminderTone: options.reminderTone || null,
          energyRhythm: options.energyRhythm || null,
        },
        createdBy: uid,
        workspaceId: options.workspaceId || null,
      })
      created += 1
    } catch (error) {
      console.warn('[GuestStarter] task creation failed', template?.key, error?.message || error)
    }
  }

  try {
    await updateDoc(doc(db, 'users', uid), {
      firstVisitInitialized: true,
      starterTasksSeededAt: serverTimestamp(),
      starterSource: options.source || 'guest_starter',
    })
    setLocalSeedState(uid, '1')
  } catch (error) {
    console.warn('[GuestStarter] failed to update user seed flag', error?.message || error)
    if (!force) clearLocalSeedState(uid)
  }

  return { created }
}

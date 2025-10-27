// batchReminders.js - Handle batch reminder creation and scheduling
import { db } from './firebaseAdmin.js';
import { splitTasks } from './openaiService.js';
import { queueReminder } from './reminderService.js';

/**
 * Creates multiple reminders from a single text input, handling temporal relationships
 * @param {string} batchText - The user's text containing multiple tasks
 * @param {string} userId - The user's ID
 * @param {Object} options - Additional options like timezone, channels
 * @returns {Array} Created reminder documents
 */
export async function createBatchReminders(batchText, userId, options = {}) {
  // Extract tasks with temporal relationships
  const parsed = await splitTasks(batchText, {
    timezone: options.timezone,
    currentTime: new Date().toISOString(),
    maxItems: options.maxItems || 10
  });

  if (!parsed?.tasks?.length) {
    throw new Error('No tasks could be extracted from text');
  }

  // Batch create reminders but skip queueing
  const reminderDocs = [];
  const batch = db.batch();

  for (const task of parsed.tasks) {
    const reminder = {
      task: task.title + (task.details ? ` - ${task.details}` : ''),
      scheduledTime: new Date(task.scheduledTime),
      userId: String(userId),
      channels: options.channels || ['whatsapp', 'pwa', 'email'],
      createdAt: new Date(),
      status: 'scheduled',
      sentAt: null,
      taskId: null,
      timezone: options.timezone,
      // Store task relationships for future reference
      timeInfo: {
        type: task.time?.type || 'computed',
        relatedTasks: task.time?.value || null,
        estimateMinutes: task.estimate_minutes,
        energy: task.energy,
        context: task.context
      }
    };

    const docRef = db.collection('reminders').doc();
    batch.set(docRef, reminder);
    reminderDocs.push({ id: docRef.id, ...reminder });
  }

  // Commit all reminders in one batch
  await batch.commit();

  // Now queue all reminders with their final times
  await Promise.all(reminderDocs.map(doc => queueReminder(doc)));

  return reminderDocs;
}
import admin, { db } from '../../server/firebaseAdmin.js';
import { registerAutomation } from './automationEngine.js';
import { voiceToTasks } from './voiceOrchestrator.js';
const RULE_ID_TRANSCRIPT = 'meeting.transcript_to_tasks';

function validateTasks(tasks) {
  if (!Array.isArray(tasks)) return { valid: false, errors: ['tasks must be an array'] };
  const errors = [];
  tasks.forEach((task, idx) => {
    if (!task || typeof task !== 'object') {
      errors.push(`task[${idx}] invalid object`);
      return;
    }
    if (!task.title || typeof task.title !== 'string') errors.push(`task[${idx}].title missing`);
    if (task.description != null && typeof task.description !== 'string') errors.push(`task[${idx}].description must be string`);
    if (task.assignees && !Array.isArray(task.assignees)) errors.push(`task[${idx}].assignees must be array`);
    if (task.status && !['todo', 'in_progress', 'blocked', 'done'].includes(task.status)) errors.push(`task[${idx}].status invalid`);
    if (task.priority && !['low', 'medium', 'high'].includes(task.priority)) errors.push(`task[${idx}].priority invalid`);
  });
  return { valid: errors.length === 0, errors };
}

registerAutomation(
  'meeting.transcript_ready',
  async ({ orgId, payload }) => {
    const { meetingId, transcript, summary } = payload;
    if (!meetingId) {
      return { status: 'skipped', message: 'Missing meetingId in payload.' };
    }

    const providedTasks = Array.isArray(payload?.tasks) ? payload.tasks : null;
    const tasks = providedTasks && providedTasks.length
      ? providedTasks
      : await voiceToTasks({ orgId, transcript, summary });

    if (!tasks.length) {
      return { status: 'skipped', message: 'No tasks generated from transcript.' };
    }

    const validation = validateTasks(tasks);
    if (!validation.valid) {
      return {
        status: 'validation_failed',
        message: validation.errors.join('; '),
      };
    }

    let alreadyProcessed = false;
    await db.runTransaction(async (tx) => {
      const guardRef = db.doc(`orgs/${orgId}/meetings/${meetingId}/automation/${RULE_ID_TRANSCRIPT}`);
      const guardSnap = await tx.get(guardRef);
      if (guardSnap.exists) {
        alreadyProcessed = true;
        return;
      }

      const tasksCol = db.collection(`orgs/${orgId}/tasks`);
      tasks.forEach((task) => {
        const ref = tasksCol.doc();
        tx.set(ref, {
          ...task,
          projectId: task.projectId || null,
          boardId: task.boardId || null,
          column: task.column || null,
          assignees: Array.isArray(task.assignees) ? task.assignees : [],
          createdAt: new Date(),
          updatedAt: new Date(),
          source: task.source || 'voice',
          meetingId,
        });
      });

      tx.set(guardRef, {
        processedAt: new Date(),
        taskCount: tasks.length,
      });
    });

    if (alreadyProcessed) {
      return {
        status: 'skipped',
        message: 'Tasks already created for this transcript.',
      };
    }

    return {
      status: 'success',
      message: `Created ${tasks.length} tasks from transcript.`,
      payload: { tasksCreated: tasks.length },
    };
  },
  { ruleId: RULE_ID_TRANSCRIPT, action: 'create_tasks_from_transcript' }
);

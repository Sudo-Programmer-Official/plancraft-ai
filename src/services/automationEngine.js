// Lightweight automation engine with Firestore logging
// Provides rule registration, event dispatching, and audit trail persistence.

import admin, { db as firestore } from '../../server/firebaseAdmin.js';

const rules = new Map();
const db = firestore;

export function registerAutomation(event, handler, options = {}) {
  if (!rules.has(event)) rules.set(event, []);
  const meta = {
    ruleId: options.ruleId || null,
    action: options.action || 'execute',
  };
  rules.get(event).push({ handler, meta });
}

export async function logAutomationEvent({ orgId, event, status, message = null, payload = null, ruleId = null, action = null }) {
  try {
    const ref = await db
      .collection(`orgs/${orgId}/automationLogs`)
      .add({
        event,
        status,
        ruleId,
        action,
        message,
        payload,
        createdAt: new Date(),
      });
    return ref.id;
  } catch (err) {
    console.error('[automation] failed to log event', err);
    return null;
  }
}

export async function scheduleAutomation({ orgId, event, payload }) {
  await logAutomationEvent({ orgId, event, status: 'received', action: 'dispatch', payload });

  const handlers = rules.get(event) || [];
  for (const entry of handlers) {
    const { handler, meta } = entry;
    const handlerName = handler?.name || meta?.ruleId || 'anonymous';
    try {
      const result = await Promise.resolve(handler({ orgId, event, payload }));
      const status = result?.status || 'success';
      const message = result?.message || `Handler ${handlerName} executed successfully.`;
      await logAutomationEvent({
        orgId,
        event,
        ruleId: meta?.ruleId || null,
        action: meta?.action || 'execute',
        status,
        message,
        payload: result?.payload || null,
      });
    } catch (err) {
      console.error(`[automation] handler error (${event})`, err);
      await logAutomationEvent({
        orgId,
        event,
        ruleId: meta?.ruleId || null,
        action: meta?.action || 'execute',
        status: 'error',
        message: `Handler ${handlerName} failed: ${err?.message || 'Error'}`,
      });
    }
  }
}

// Example: registerAutomation('meeting.transcript_ready', async ({ orgId, payload }) => {...})

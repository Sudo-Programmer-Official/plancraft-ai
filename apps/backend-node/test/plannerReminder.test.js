import test from "node:test";
import assert from "node:assert/strict";
import { buildDeterministicReminderAction } from "../services/plannerAssistantService.js";

const context = {
  runtime: {
    clientTimezone: "America/New_York",
    clientNow: "2026-09-29T22:20:00-04:00",
  },
};

test("executes a reminder written with number words", () => {
  const action = buildDeterministicReminderAction("Remind me to go to bed in one hour.", context);

  assert.deepEqual(action, {
    type: "schedule_reminder",
    payload: {
      text: "Go to bed",
      scheduledTime: "2026-09-30T03:20:00.000Z",
      timezone: "America/New_York",
    },
  });
});

test("supports reminders phrased with the time before the action", () => {
  const action = buildDeterministicReminderAction("Remind me in 30 minutes to call Mom", context);

  assert.equal(action?.payload?.text, "Call Mom");
  assert.equal(action?.payload?.scheduledTime, "2026-09-30T02:50:00.000Z");
});

test("leaves reminders without a resolvable time for clarification", () => {
  assert.equal(buildDeterministicReminderAction("Remind me to call Mom", context), null);
});

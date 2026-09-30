import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRelativeTimingToAction,
  buildDeterministicReminderAction,
} from "../services/plannerAssistantService.js";

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

test("resolves a natural relative request from the client timezone", () => {
  const action = buildDeterministicReminderAction("Go to bed in 30 minutes", context);

  assert.equal(action?.payload?.scheduledTime, "2026-09-30T02:50:00.000Z");
  assert.deepEqual(
    applyRelativeTimingToAction(
      { type: "create_task", payload: { title: "Go to bed", date: "2026-09-29", reminderTime: "21:41" } },
      action,
    ),
    {
      type: "create_task",
      payload: {
        title: "Go to bed",
        date: "2026-09-29",
        reminderTime: "22:50",
        scheduledTime: "2026-09-30T02:50:00.000Z",
        timezone: "America/New_York",
      },
    },
  );
});

test("leaves reminders without a resolvable time for clarification", () => {
  assert.equal(buildDeterministicReminderAction("Remind me to call Mom", context), null);
});

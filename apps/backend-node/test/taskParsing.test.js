import test from "node:test"
import assert from "node:assert/strict"
import { buildSafeTaskFallback, parseTaskLocally } from "../services/localTaskParser.js"
import { routeTaskParse } from "../services/aiProviderRouter.js"

const options = {
  timezone: "America/New_York",
  now: "2026-09-29T09:00:00-04:00",
}

test("local parser creates a dated task without an AI provider", () => {
  const result = parseTaskLocally("Call dentist tomorrow at 3pm", options)
  assert.equal(result.confident, true)
  assert.equal(result.tasks[0].title, "Call dentist")
  assert.equal(result.tasks[0].date, "2026-09-30")
  assert.match(result.tasks[0].scheduledTime, /15:00:00-04:00$/)
  assert.equal(result.tasks[0].source, "local")
})

test("local parser does not turn a reflection into a task", () => {
  const result = parseTaskLocally("I feel overwhelmed today", options)
  assert.equal(result.confident, false)
  assert.deepEqual(result.tasks, [])
})

test("local parser leaves multi-action requests for a provider", () => {
  const result = parseTaskLocally("Call the dentist and email my manager", options)
  assert.equal(result.confident, false)
})

test("router uses the deterministic safe fallback when no provider is configured", async () => {
  const previous = process.env.AI_TASK_PROVIDER_ORDER
  const keys = ["GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY"]
  const previousKeys = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  process.env.AI_TASK_PROVIDER_ORDER = "gemini,groq,openrouter"
  keys.forEach((key) => delete process.env[key])

  try {
    const result = await routeTaskParse({ input: "Break my AWS interview preparation into three evenings", ...options })
    assert.equal(result.parser, "local-safe-fallback")
    assert.equal(result.tasks[0].source, "local-safe-fallback")
    assert.match(result.fallbackReason, /NO_PROVIDER_CONFIGURED/)
  } finally {
    if (previous === undefined) delete process.env.AI_TASK_PROVIDER_ORDER
    else process.env.AI_TASK_PROVIDER_ORDER = previous
    keys.forEach((key) => {
      if (previousKeys[key] === undefined) delete process.env[key]
      else process.env[key] = previousKeys[key]
    })
  }
})

test("safe fallback always produces a usable title", () => {
  const result = buildSafeTaskFallback("Please remember to send the proposal")
  assert.equal(result.tasks[0].title, "send the proposal")
  assert.equal(result.tasks[0].confidence, 0.25)
})


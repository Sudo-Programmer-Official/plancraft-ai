import test from "node:test"
import assert from "node:assert/strict"
import {
  buildSafeTaskFallback,
  minimumExpectedTaskCount,
  parseTaskLocally,
} from "../services/localTaskParser.js"
import {
  buildTaskPrompt,
  providerOrder,
  routeTaskParse,
} from "../services/aiProviderRouter.js"

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

test("local parser splits independent actions with different verbs", () => {
  const result = parseTaskLocally("Call the dentist and email my manager", options)
  assert.equal(result.confident, true)
  assert.deepEqual(result.tasks.map((task) => task.title), [
    "Call the dentist",
    "email my manager",
  ])
})

test("local parser splits a morning list into every independent task", () => {
  const result = parseTaskLocally(
    "I need to call the dentist, email my manager, and buy groceries tomorrow morning",
    options,
  )
  assert.equal(result.confident, true)
  assert.deepEqual(result.tasks.map((task) => task.title), [
    "call the dentist",
    "email my manager",
    "buy groceries",
  ])
  assert.deepEqual(result.tasks.map((task) => task.date), [
    "2026-09-30",
    "2026-09-30",
    "2026-09-30",
  ])
})

test("multi-action detection requires the provider to return every action", () => {
  assert.equal(
    minimumExpectedTaskCount(
      "In the morning, call the dentist, email my manager, and buy groceries",
      options,
    ),
    3,
  )
})

test("multi-action provider prompt explicitly forbids collapsing tasks", () => {
  const prompt = buildTaskPrompt({
    input: "Call the dentist, email my manager, and buy groceries",
    timezone: options.timezone,
    now: options.now,
    maxItems: 6,
  })
  assert.match(prompt, /Count the independent action units/i)
  assert.match(prompt, /Never merge several independent actions/i)
  assert.match(prompt, /must produce three task objects/i)
})

test("OpenAI is preferred for multi-action requests when configured", () => {
  const previousOrder = process.env.AI_TASK_PROVIDER_ORDER
  const previousOpenAiKey = process.env.OPENAI_API_KEY
  process.env.AI_TASK_PROVIDER_ORDER = "gemini,groq,openrouter"
  process.env.OPENAI_API_KEY = "test-key"

  try {
    assert.deepEqual(providerOrder({ preferOpenAI: true }).slice(0, 2), ["openai", "gemini"])
  } finally {
    if (previousOrder === undefined) delete process.env.AI_TASK_PROVIDER_ORDER
    else process.env.AI_TASK_PROVIDER_ORDER = previousOrder
    if (previousOpenAiKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = previousOpenAiKey
  }
})

test("local parser expands a short action list into separate tasks", () => {
  const result = parseTaskLocally("Learn springboard apps, AI, and algorithm patterns", options)
  assert.equal(result.confident, true)
  assert.deepEqual(result.tasks.map((task) => task.title), [
    "Learn springboard apps",
    "Learn AI",
    "Learn algorithm patterns",
  ])
})

test("local parser expands action lists after a natural-language prefix", () => {
  const result = parseTaskLocally("I want to learn springboard apps, AI, and algorithm patterns", options)
  assert.deepEqual(result.tasks.map((task) => task.title), [
    "learn springboard apps",
    "learn AI",
    "learn algorithm patterns",
  ])
})

test("router keeps a common multi-action request multi-task without a provider", async () => {
  const result = await routeTaskParse({
    input: "Call the dentist, email my manager, and buy groceries",
    ...options,
  })
  assert.equal(result.parser, "local")
  assert.deepEqual(result.tasks.map((task) => task.title), [
    "Call the dentist",
    "email my manager",
    "buy groceries",
  ])
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


import test from "node:test";
import assert from "node:assert/strict";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { createPlanCraftMcpServer, MCP_TOOL_NAMES } from "../services/mcpServer.js";

async function callMcp(method, params = {}) {
  const handler = createMcpHandler(
    () => createPlanCraftMcpServer({ userId: "mcp-test-user" }),
    { legacy: "stateless" },
  );
  const body = { jsonrpc: "2.0", id: 1, method, params };
  const response = await handler.fetch(
    new Request("http://localhost/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(body),
    }),
    { parsedBody: body },
  );
  const text = await response.text();
  const dataLine = text.split("\n").find((line) => line.startsWith("data: "));
  return dataLine ? JSON.parse(dataLine.slice("data: ".length)) : JSON.parse(text);
}

test("MCP advertises the initial PlanCraft task tools", async () => {
  const payload = await callMcp("tools/list");
  const names = payload.result.tools.map((tool) => tool.name);

  assert.deepEqual(names, MCP_TOOL_NAMES);
  assert.ok(names.includes("create_tasks"));
  assert.equal(payload.result.tools.find((tool) => tool.name === "create_tasks").inputSchema.properties.tasks.maxItems, 10);
});

test("MCP validates tool arguments before touching workspace data", async () => {
  const payload = await callMcp("tools/call", {
    name: "create_tasks",
    arguments: { workspaceId: "", tasks: [] },
  });

  assert.equal(payload.result.isError, true);
  assert.match(payload.result.content[0].text, /invalid|workspaceId|tasks/i);
});

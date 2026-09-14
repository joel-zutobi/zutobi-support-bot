import assert from "node:assert/strict";
import test from "node:test";

import { Client, InMemoryTransport } from "@modelcontextprotocol/client";

import type { LookupService } from "../src/lookup.js";
import { TOOL_NAME, createServer } from "../src/server.js";

test("lists and calls the single read-only MCP tool", async () => {
  const lookupService: LookupService = {
    async lookup(input) {
      return {
        match: "none",
        count: 0,
        lookup_by: input.email === undefined ? "user_id" : "email",
        source: "zutobi_admin_api",
        retrieved_at: "2026-09-14T13:00:00.000Z",
      };
    },
  };
  const server = createServer(lookupService);
  const client = new Client({ name: "zutobi-user-lookup-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const tools = await client.listTools();
    assert.equal(tools.tools.length, 1);
    assert.equal(tools.tools[0]?.name, TOOL_NAME);
    assert.equal(tools.tools[0]?.annotations?.readOnlyHint, true);
    assert.equal(tools.tools[0]?.annotations?.destructiveHint, false);

    const result = await client.callTool({
      name: TOOL_NAME,
      arguments: { email: "sam@example.com" },
    });
    assert.equal(result.isError, undefined);
    assert.deepEqual(result.structuredContent, {
      match: "none",
      count: 0,
      lookup_by: "email",
      source: "zutobi_admin_api",
      retrieved_at: "2026-09-14T13:00:00.000Z",
    });
  } finally {
    await client.close();
    await server.close();
  }
});

test("rejects a call with both lookup keys", async () => {
  const lookupService: LookupService = {
    async lookup() {
      throw new Error("handler should not run");
    },
  };
  const server = createServer(lookupService);
  const client = new Client({ name: "zutobi-user-lookup-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const result = await client.callTool({
      name: TOOL_NAME,
      arguments: { email: "sam@example.com", user_id: 1234567 },
    });
    assert.equal(result.isError, true);
  } finally {
    await client.close();
    await server.close();
  }
});

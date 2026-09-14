#!/usr/bin/env node

import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { loadConfig } from "./config.js";
import { ZutobiAdminClient } from "./lookup.js";
import { createServer } from "./server.js";

const config = loadConfig();

void serveStdio(() =>
  createServer(
    new ZutobiAdminClient({
      token: config.token,
      timeoutMs: config.timeoutMs,
      maxResponseBytes: config.maxResponseBytes,
    }),
  ),
);

console.error("Zutobi user lookup MCP is running on stdio");

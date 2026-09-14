import assert from "node:assert/strict";
import test from "node:test";

import { loadConfig } from "../src/config.js";

test("uses a 60-second lookup timeout by default", () => {
  const config = loadConfig({ ZUTOBI_ADMIN_AUTH_TOKEN: " synthetic-token " });

  assert.deepEqual(config, {
    token: "synthetic-token",
    timeoutMs: 60_000,
    maxResponseBytes: 1_048_576,
  });
});

test("accepts explicit positive integer limits", () => {
  const config = loadConfig({
    ZUTOBI_ADMIN_AUTH_TOKEN: "synthetic-token",
    ZUTOBI_LOOKUP_TIMEOUT_MS: "90000",
    ZUTOBI_LOOKUP_MAX_RESPONSE_BYTES: "2048",
  });

  assert.equal(config.timeoutMs, 90_000);
  assert.equal(config.maxResponseBytes, 2_048);
});

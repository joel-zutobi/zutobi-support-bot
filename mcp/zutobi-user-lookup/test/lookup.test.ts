import assert from "node:assert/strict";
import test from "node:test";

import { LookupError, ZutobiAdminClient, normalizeLookupInput } from "../src/lookup.js";

const NOW = new Date("2026-09-14T13:00:00.000Z");

function upstreamUser(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 1234567,
    username: "sample",
    first_name: "Sam",
    last_name: "Example",
    email: "sam@example.com",
    user_type: "student",
    created_at: "2025-01-02T03:04:05Z",
    active_subs: ["premium"],
    subscription_details: [{ provider: "stripe", end_date: "2026-10-01T00:00:00Z" }],
    subject_code_id: "california",
    course_code_id: "car",
    course: "Car",
    country: "United States",
    has_subscription: true,
    ...overrides,
  };
}

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(value), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

function expectLookupError(error: unknown, code: string): boolean {
  assert.ok(error instanceof LookupError);
  assert.equal(error.code, code);
  return true;
}

test("normalizes an email lookup and calls only the fixed read endpoint", async () => {
  let observedUrl: URL | undefined;
  let observedInit: RequestInit | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    observedUrl = new URL(input instanceof Request ? input.url : input.toString());
    observedInit = init;
    return jsonResponse({ count: 1, results: [upstreamUser()] });
  };

  const client = new ZutobiAdminClient({ token: "synthetic-token", fetchImpl, now: () => NOW });
  const result = await client.lookup({ email: "  SAM@EXAMPLE.COM  " });

  assert.equal(observedUrl?.origin, "https://webapi.zutobi.com");
  assert.equal(observedUrl?.pathname, "/api/v3/admin/user");
  assert.equal(observedUrl?.searchParams.get("email"), "sam@example.com");
  assert.equal(observedUrl?.searchParams.has("pk"), false);
  assert.equal(observedInit?.method, "GET");
  assert.equal(new Headers(observedInit?.headers).get("x-authtoken"), "synthetic-token");
  assert.equal(observedInit?.redirect, "error");
  assert.deepEqual(result, {
    match: "single",
    count: 1,
    lookup_by: "email",
    source: "zutobi_admin_api",
    retrieved_at: NOW.toISOString(),
    user: {
      user_id: 1234567,
      account_email: "sam@example.com",
      first_name: "Sam",
      user_type: "student",
      created_at: "2025-01-02T03:04:05Z",
      has_subscription: true,
      active_subscriptions: ["premium"],
      subscription_details: [{ provider: "stripe", end_date: "2026-10-01T00:00:00Z" }],
      subject_code: "california",
      course_code: "car",
      course: "Car",
      country: "United States",
    },
  });
});

test("uses pk for a numeric user ID", async () => {
  let observedUrl: URL | undefined;
  const fetchImpl: typeof fetch = async (input) => {
    observedUrl = new URL(input instanceof Request ? input.url : input.toString());
    return jsonResponse({ count: 0, results: [] });
  };
  const client = new ZutobiAdminClient({ token: "synthetic-token", fetchImpl, now: () => NOW });

  const result = await client.lookup({ user_id: 7654321 });

  assert.equal(observedUrl?.searchParams.get("pk"), "7654321");
  assert.equal(observedUrl?.searchParams.has("email"), false);
  assert.equal(result.match, "none");
  assert.equal(result.lookup_by, "user_id");
});

test("rejects invalid or conflicting inputs before making a request", () => {
  assert.throws(() => normalizeLookupInput({}), (error) => expectLookupError(error, "INVALID_INPUT"));
  assert.throws(
    () => normalizeLookupInput({ email: "sam@example.com", user_id: 1 }),
    (error) => expectLookupError(error, "INVALID_INPUT"),
  );
  assert.throws(
    () => normalizeLookupInput({ email: "not-an-email" }),
    (error) => expectLookupError(error, "INVALID_INPUT"),
  );
  assert.throws(
    () => normalizeLookupInput({ user_id: 0 }),
    (error) => expectLookupError(error, "INVALID_INPUT"),
  );
});

test("returns an ambiguous state without exposing user records", async () => {
  const fetchImpl: typeof fetch = async () =>
    jsonResponse({
      count: 2,
      results: [
        upstreamUser({ user_id: 1111111, email: "first@example.com" }),
        upstreamUser({ user_id: 2222222, email: "second@example.com" }),
      ],
    });
  const client = new ZutobiAdminClient({ token: "synthetic-token", fetchImpl, now: () => NOW });

  const result = await client.lookup({ email: "shared@example.com" });

  assert.deepEqual(result, {
    match: "ambiguous",
    count: 2,
    lookup_by: "email",
    source: "zutobi_admin_api",
    retrieved_at: NOW.toISOString(),
  });
  assert.equal(JSON.stringify(result).includes("first@example.com"), false);
});

test("reports authentication failures without returning the response body", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response("sensitive upstream details", { status: 403 });
  const client = new ZutobiAdminClient({ token: "synthetic-token", fetchImpl });

  await assert.rejects(
    client.lookup({ user_id: 1234567 }),
    (error) => {
      expectLookupError(error, "UPSTREAM_AUTH_FAILED");
      assert.equal(String(error).includes("sensitive upstream details"), false);
      return true;
    },
  );
});

test("rejects malformed and inconsistent upstream responses", async () => {
  const malformedClient = new ZutobiAdminClient({
    token: "synthetic-token",
    fetchImpl: async () => new Response("not json", { status: 200 }),
  });
  await assert.rejects(
    malformedClient.lookup({ user_id: 1234567 }),
    (error) => expectLookupError(error, "UPSTREAM_INVALID_RESPONSE"),
  );

  const inconsistentClient = new ZutobiAdminClient({
    token: "synthetic-token",
    fetchImpl: async () => jsonResponse({ count: 1, results: [] }),
  });
  await assert.rejects(
    inconsistentClient.lookup({ user_id: 1234567 }),
    (error) => expectLookupError(error, "UPSTREAM_INVALID_RESPONSE"),
  );
});

test("stops before reading a response larger than the configured limit", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response("{}", { status: 200, headers: { "content-length": "100" } });
  const client = new ZutobiAdminClient({
    token: "synthetic-token",
    fetchImpl,
    maxResponseBytes: 50,
  });

  await assert.rejects(
    client.lookup({ user_id: 1234567 }),
    (error) => expectLookupError(error, "UPSTREAM_RESPONSE_TOO_LARGE"),
  );
});

test("aborts requests that exceed the timeout", async () => {
  const fetchImpl: typeof fetch = async (_input, init) =>
    await new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) {
        reject(new Error("missing signal"));
        return;
      }
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  const client = new ZutobiAdminClient({ token: "synthetic-token", fetchImpl, timeoutMs: 10 });

  await assert.rejects(
    client.lookup({ user_id: 1234567 }),
    (error) => expectLookupError(error, "UPSTREAM_TIMEOUT"),
  );
});

test("aborts a response body that stalls after headers", async () => {
  const fetchImpl: typeof fetch = async (_input, init) => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"count":'));
        init?.signal?.addEventListener(
          "abort",
          () => controller.error(init.signal?.reason),
          { once: true },
        );
      },
    });
    return new Response(body, { status: 200 });
  };
  const client = new ZutobiAdminClient({ token: "synthetic-token", fetchImpl, timeoutMs: 10 });

  await assert.rejects(
    client.lookup({ user_id: 1234567 }),
    (error) => expectLookupError(error, "UPSTREAM_TIMEOUT"),
  );
});

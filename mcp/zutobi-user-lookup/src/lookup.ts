import * as z from "zod/v4";

import {
  type LookupInput,
  type LookupResult,
  type UpstreamUser,
  lookupInputSchema,
  upstreamResponseSchema,
} from "./contracts.js";

const ENDPOINT = "https://webapi.zutobi.com/api/v3/admin/user";
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;

export type LookupErrorCode =
  | "INVALID_INPUT"
  | "UPSTREAM_AUTH_FAILED"
  | "UPSTREAM_RATE_LIMITED"
  | "UPSTREAM_HTTP_ERROR"
  | "UPSTREAM_NETWORK_ERROR"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_RESPONSE_TOO_LARGE"
  | "UPSTREAM_INVALID_RESPONSE";

export class LookupError extends Error {
  readonly code: LookupErrorCode;

  constructor(code: LookupErrorCode, message: string) {
    super(message);
    this.name = "LookupError";
    this.code = code;
  }
}

export type LookupService = {
  lookup(input: LookupInput): Promise<LookupResult>;
};

export type ZutobiAdminClientOptions = {
  token: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxResponseBytes?: number;
  now?: () => Date;
};

type NormalizedQuery =
  | { lookupBy: "email"; parameter: "email"; value: string }
  | { lookupBy: "user_id"; parameter: "pk"; value: string };

function parsePositiveInteger(value: number | undefined, name: string): number {
  if (value === undefined || !Number.isSafeInteger(value) || value <= 0) {
    throw new LookupError("INVALID_INPUT", `${name} must be a positive safe integer`);
  }
  return value;
}

export function normalizeLookupInput(input: unknown): NormalizedQuery {
  const parsed = lookupInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new LookupError("INVALID_INPUT", z.prettifyError(parsed.error));
  }

  if (parsed.data.email !== undefined) {
    const email = parsed.data.email.toLowerCase();
    const emailResult = z.email().safeParse(email);
    if (!emailResult.success) {
      throw new LookupError("INVALID_INPUT", "email must be a valid email address");
    }
    return { lookupBy: "email", parameter: "email", value: email };
  }

  const userId = parsePositiveInteger(parsed.data.user_id, "user_id");
  return { lookupBy: "user_id", parameter: "pk", value: String(userId) };
}

function nullable(value: string | null | undefined): string | null {
  return value ?? null;
}

function normalizeUser(user: UpstreamUser) {
  return {
    user_id: user.user_id,
    account_email: user.email,
    first_name: nullable(user.first_name),
    user_type: nullable(user.user_type),
    created_at: nullable(user.created_at),
    has_subscription: user.has_subscription,
    active_subscriptions: [...new Set(user.active_subs)],
    subscription_details: user.subscription_details.map((subscription) => ({
      provider: subscription.provider,
      end_date: nullable(subscription.end_date),
    })),
    subject_code: nullable(user.subject_code_id),
    course_code: nullable(user.course_code_id),
    course: nullable(user.course),
    country: nullable(user.country),
  };
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      throw new LookupError(
        "UPSTREAM_RESPONSE_TOO_LARGE",
        "Zutobi admin API response exceeded the configured size limit",
      );
    }
  }

  if (response.body === null) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new LookupError(
        "UPSTREAM_RESPONSE_TOO_LARGE",
        "Zutobi admin API response exceeded the configured size limit",
      );
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export class ZutobiAdminClient implements LookupService {
  readonly #token: string;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;
  readonly #maxResponseBytes: number;
  readonly #now: () => Date;

  constructor(options: ZutobiAdminClientOptions) {
    const token = options.token.trim();
    if (token.length === 0) {
      throw new Error("ZUTOBI_ADMIN_AUTH_TOKEN is required");
    }
    if (token.includes("\r") || token.includes("\n")) {
      throw new Error("ZUTOBI_ADMIN_AUTH_TOKEN must be a single line");
    }

    this.#token = token;
    this.#fetch = options.fetchImpl ?? globalThis.fetch;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
    this.#now = options.now ?? (() => new Date());

    if (!Number.isSafeInteger(this.#timeoutMs) || this.#timeoutMs <= 0) {
      throw new Error("timeoutMs must be a positive integer");
    }
    if (!Number.isSafeInteger(this.#maxResponseBytes) || this.#maxResponseBytes <= 0) {
      throw new Error("maxResponseBytes must be a positive integer");
    }
  }

  async lookup(input: LookupInput): Promise<LookupResult> {
    const query = normalizeLookupInput(input);
    const url = new URL(ENDPOINT);
    url.searchParams.set(query.parameter, query.value);

    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.#timeoutMs);

    let response: Response;
    try {
      response = await this.#fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          "x-authtoken": this.#token,
        },
        redirect: "error",
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      if (timedOut) {
        throw new LookupError("UPSTREAM_TIMEOUT", "Zutobi admin API request timed out");
      }
      if (error instanceof LookupError) {
        throw error;
      }
      throw new LookupError("UPSTREAM_NETWORK_ERROR", "Zutobi admin API request failed");
    }

    if (response.status === 401 || response.status === 403) {
      clearTimeout(timeout);
      throw new LookupError(
        "UPSTREAM_AUTH_FAILED",
        "Zutobi admin API rejected the configured token",
      );
    }
    if (response.status === 429) {
      clearTimeout(timeout);
      throw new LookupError("UPSTREAM_RATE_LIMITED", "Zutobi admin API rate limit reached");
    }
    if (!response.ok) {
      clearTimeout(timeout);
      throw new LookupError(
        "UPSTREAM_HTTP_ERROR",
        `Zutobi admin API returned HTTP ${response.status}`,
      );
    }

    let body: string;
    try {
      body = await readBoundedBody(response, this.#maxResponseBytes);
    } catch (error) {
      if (timedOut) {
        throw new LookupError("UPSTREAM_TIMEOUT", "Zutobi admin API request timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      throw new LookupError(
        "UPSTREAM_INVALID_RESPONSE",
        "Zutobi admin API returned malformed JSON",
      );
    }

    const parsed = upstreamResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new LookupError(
        "UPSTREAM_INVALID_RESPONSE",
        "Zutobi admin API returned an unexpected response shape",
      );
    }

    const retrievedAt = this.#now().toISOString();
    const metadata = {
      lookup_by: query.lookupBy,
      source: "zutobi_admin_api" as const,
      retrieved_at: retrievedAt,
    };

    if (parsed.data.count === 0 && parsed.data.results.length === 0) {
      return { match: "none", count: 0, ...metadata };
    }

    if (parsed.data.count === 1 && parsed.data.results.length === 1) {
      const user = parsed.data.results[0];
      if (user === undefined) {
        throw new LookupError(
          "UPSTREAM_INVALID_RESPONSE",
          "Zutobi admin API returned an inconsistent result count",
        );
      }
      return { match: "single", count: 1, user: normalizeUser(user), ...metadata };
    }

    if (parsed.data.count >= 2) {
      return { match: "ambiguous", count: parsed.data.count, ...metadata };
    }

    throw new LookupError(
      "UPSTREAM_INVALID_RESPONSE",
      "Zutobi admin API returned an inconsistent result count",
    );
  }
}

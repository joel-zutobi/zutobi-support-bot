export type ServerConfig = {
  token: string;
  timeoutMs: number;
  maxResponseBytes: number;
};

function readPositiveInteger(
  environment: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
): number {
  const raw = environment[name];
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  const token = environment.ZUTOBI_ADMIN_AUTH_TOKEN?.trim();
  if (!token) {
    throw new Error("ZUTOBI_ADMIN_AUTH_TOKEN is required");
  }

  return {
    token,
    timeoutMs: readPositiveInteger(environment, "ZUTOBI_LOOKUP_TIMEOUT_MS", 8_000),
    maxResponseBytes: readPositiveInteger(
      environment,
      "ZUTOBI_LOOKUP_MAX_RESPONSE_BYTES",
      1_048_576,
    ),
  };
}

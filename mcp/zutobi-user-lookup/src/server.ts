import { McpServer } from "@modelcontextprotocol/server";

import { lookupInputSchema, lookupResultSchema } from "./contracts.js";
import { LookupError, type LookupService } from "./lookup.js";

export const TOOL_NAME = "lookup_zutobi_user";

export function createServer(lookupService: LookupService): McpServer {
  const server = new McpServer(
    { name: "zutobi-user-lookup", version: "0.1.0" },
    {
      instructions:
        "Use this server only to verify Zutobi account and subscription facts for support work. " +
        "A no-match or ambiguous result requires human review. Never disclose one account's details to another person.",
    },
  );

  server.registerTool(
    TOOL_NAME,
    {
      title: "Look up a Zutobi user",
      description:
        "Read a Zutobi account and its basic subscription state by exact email or numeric user ID. " +
        "Provide exactly one input. This tool cannot modify accounts, subscriptions, or payments.",
      inputSchema: lookupInputSchema,
      outputSchema: lookupResultSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input) => {
      try {
        const result = await lookupService.lookup(input);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          structuredContent: { ...result },
        };
      } catch (error) {
        const safeError =
          error instanceof LookupError
            ? { code: error.code, message: error.message }
            : { code: "INTERNAL_ERROR", message: "Unexpected lookup failure" };

        return {
          isError: true,
          content: [{ type: "text", text: JSON.stringify(safeError) }],
        };
      }
    },
  );

  return server;
}

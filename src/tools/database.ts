import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.values(value).every(isJsonValue);
  }
  return false;
}

// The API's title-update example uses a string, despite val's object-only schema.
// Accept JSON primitives as well as objects, arrays and explicit null.
export const transactionRequestSchema = z.record(
  z.string().uuid(),
  z.array(z.object({
    path: z.string().trim().min(1),
    op: z.enum(["add", "update", "remove"]),
    val: z.any().refine(isJsonValue, "val must be present and contain a JSON value"),
  }).strict()).min(1),
).refine((changes) => Object.keys(changes).length > 0, "At least one database is required");

export function registerDatabaseTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "database_rows_list",
    "List rows in a database document.",
    {
      parentDocumentId: z.string().describe("Parent document ID of the database"),
      filter: z.any().optional().describe("Filter criteria"),
      propertyType: z.string().optional().describe("Property type to filter by"),
      orderBy: z.string().optional().describe("Field to order by"),
      direction: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
    },
    async (params) =>
      textResult(await client.request("database.rows.list", params)),
  );

  server.tool(
    "database_transaction",
    "Execute one database transaction. changes maps database UUIDs to arrays of {path, op, val}. No automatic retry: after a write error, read back the affected rows before retrying.",
    {
      changes: transactionRequestSchema.describe(
        "Object keyed by database UUID, each value an array of operations with path, op (add/update/remove) and val (JSON value, including null).",
      ),
    },
    async (params) => {
      const changes = transactionRequestSchema.parse(params.changes);
      // Yonote's frontend uses /api/v2 for transactions; other tools remain on v1.
      return textResult(await client.request("v2/database/transaction", changes));
    },
  );
}

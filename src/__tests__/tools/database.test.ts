import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerDatabaseTools, transactionRequestSchema } from "../../tools/database.js";
import { YonoteClient } from "../../api-client.js";

const databaseId = "29279f7e-b256-484b-bd4f-cc3ad9a1c480";
const rowId = "d6a31868-0995-4087-a382-fab55e3c071c";

describe("database tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerDatabaseTools, client);
  });

  it("registers 2 tools", () => {
    expect(tools).toHaveLength(2);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual(["database_rows_list", "database_transaction"]);
  });

  const endpointMap: Record<string, string> = {
    database_rows_list: "database.rows.list",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("database_rows_list passes parentDocumentId", async () => {
    const handler = getToolHandler(tools, "database_rows_list");
    await handler({ parentDocumentId: "doc-1", direction: "ASC" });
    expect(client.request).toHaveBeenCalledWith("database.rows.list", {
      parentDocumentId: "doc-1",
      direction: "ASC",
    });
  });

  it("database_transaction sends the database-keyed body without a changes wrapper", async () => {
    const handler = getToolHandler(tools, "database_transaction");
    const changes = {
      [databaseId]: [{ path: `rows.${rowId}`, op: "add", val: {
        id: rowId, type: "row", title: "Test row", parentDocumentId: databaseId,
        values: { category: ["solid"] },
      } }],
    };
    await handler({ changes });
    expect(client.request).toHaveBeenCalledWith("v2/database/transaction", changes);
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it.each([
    [], {}, { "not-a-uuid": [] }, { [databaseId]: [] },
    { [databaseId]: [{ type: "insert", data: {} }] },
    { [databaseId]: [{ path: "rows.x", op: "insert", val: {} }] },
    { [databaseId]: [{ path: " ", op: "add", val: {} }] },
    { [databaseId]: [{ path: "rows.x", op: "add" }] },
    { [databaseId]: [{ path: "rows.x", op: "add", val: { x: undefined } }] },
    { [databaseId]: [{ path: "rows.x", op: "add", val: NaN }] },
  ])("rejects malformed changes before calling API (%j)", async (changes) => {
    await expect(getToolHandler(tools, "database_transaction")({ changes })).rejects.toThrow();
    expect(client.request).not.toHaveBeenCalled();
  });

  it.each([null, "Title", 1, false, [], { nested: [null, "value"] }])(
    "accepts JSON val %j", (val) => {
      expect(transactionRequestSchema.safeParse({
        [databaseId]: [{ path: `rows.${rowId}.title`, op: "update", val }],
      }).success).toBe(true);
    },
  );

  it("supports multiple databases and remove with explicit null", async () => {
    const changes = {
      [databaseId]: [{ path: `rows.${rowId}.title`, op: "update", val: "Title" }],
      [rowId]: [{ path: `rows.${databaseId}`, op: "remove", val: null }],
    };
    await getToolHandler(tools, "database_transaction")({ changes });
    expect(client.request).toHaveBeenCalledWith("v2/database/transaction", changes);
  });

  it("propagates API errors without retrying", async () => {
    vi.mocked(client.request).mockRejectedValue(new Error("Endpoint not found"));
    await expect(getToolHandler(tools, "database_transaction")({ changes: {
      [databaseId]: [{ path: `rows.${rowId}`, op: "remove", val: null }],
    } })).rejects.toThrow("Endpoint not found");
    expect(client.request).toHaveBeenCalledTimes(1);
  });
});

describe("database transaction HTTP serialization", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs to the frontend v2 route and preserves nested nulls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ success: true, status: 200, ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = new YonoteClient("test-token", "https://test.yonote.ru/api/");
    const tools = collectTools(registerDatabaseTools, client);
    const changes = {
      [databaseId]: [{ path: `rows.${rowId}`, op: "remove", val: null }],
    };
    await getToolHandler(tools, "database_transaction")({ changes });
    expect(fetchMock).toHaveBeenCalledWith("https://test.yonote.ru/api/v2/database/transaction", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token", "Content-Type": "application/json", Accept: "application/json",
      },
      body: JSON.stringify(changes),
    });
  });
});

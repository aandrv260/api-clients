import { describe, test, expect, vi, beforeEach } from "vitest";
import { GraphQLClient } from "graphql-request";
import { GraphQLError } from "../errors/GraphQLError";
import { isGraphQLNetworkError } from "../errors/GraphQLError.guards";
import { GraphQLApiClient } from "./GraphQLApiClient";
import type { GraphQLVariables } from "../models/GraphQLVariables";

function expectedGraphQLRequestCall(options: {
  document: string;
  variables?: GraphQLVariables;
  requestHeaders?: HeadersInit;
  signal?: AbortSignal;
}) {
  return {
    document: options.document,
    variables: options.variables,
    requestHeaders: options.requestHeaders,
    signal: options.signal,
  };
}

function createClient() {
  const mockRequest = vi.fn().mockResolvedValue({ data: "query-data" });

  const mockGraphQLClient = {
    request: mockRequest,
  } as unknown as GraphQLClient;

  const client = new GraphQLApiClient(mockGraphQLClient);

  return { client, mockGraphQLClient, mockRequest } as const;
}

vi.mock("graphql-request", async importOriginal => {
  const actual = await importOriginal<typeof import("graphql-request")>();

  return {
    ...actual,
    GraphQLClient: vi.fn(),
  };
});

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GraphQLApiClient", () => {
  test.each([
    ["query { user { id } }", undefined, { data: "query-data" }],
    [
      "query GetUser($id: ID!) { user(id: $id) { id } }",
      { id: "123" },
      { data: "query-data" },
    ],
  ])(
    "query() resolves with response data",
    async (operation, variables, expected) => {
      const { client } = createClient();

      const result = await client.query(operation, variables);

      expect(result).toEqual(expected);
    },
  );

  test.each([
    ["mutation { createUser { id } }", undefined, { data: "query-data" }],
    [
      "mutation CreateUser($input: UserInput!) { createUser(input: $input) { id } }",
      { input: { name: "test" } },
      { data: "query-data" },
    ],
  ])(
    "mutate() resolves with response data",
    async (operation, variables, expected) => {
      const { client } = createClient();

      const result = await client.mutate(operation, variables);

      expect(result).toEqual(expected);
    },
  );

  test("query() calls graphQLClient.request with operation", async () => {
    const { client, mockRequest } = createClient();
    const query = "query { user { id } }";

    await client.query(query);

    expect(mockRequest).toHaveBeenCalledWith(
      expectedGraphQLRequestCall({ document: query, variables: undefined }),
    );
  });

  test("query() calls graphQLClient.request with operation and variables", async () => {
    const { client, mockRequest } = createClient();
    const query = "query GetUser($id: ID!) { user(id: $id) { id } }";
    const variables: GraphQLVariables = { id: "123" };

    await client.query(query, variables);

    expect(mockRequest).toHaveBeenCalledWith(
      expectedGraphQLRequestCall({ document: query, variables }),
    );
  });

  test("mutate() calls graphQLClient.request with operation", async () => {
    const { client, mockRequest } = createClient();
    const mutation = "mutation { createUser { id } }";

    await client.mutate(mutation);

    expect(mockRequest).toHaveBeenCalledWith(
      expectedGraphQLRequestCall({ document: mutation, variables: undefined }),
    );
  });

  test("mutate() calls graphQLClient.request with operation and variables", async () => {
    const { client, mockRequest } = createClient();
    const mutation =
      "mutation CreateUser($input: UserInput!) { createUser(input: $input) { id } }";
    const variables: GraphQLVariables = { input: { name: "test" } };

    await client.mutate(mutation, variables);

    expect(mockRequest).toHaveBeenCalledWith(
      expectedGraphQLRequestCall({ document: mutation, variables }),
    );
  });

  test("query() wraps underlying GraphQL errors in GraphQLError", async () => {
    const { client, mockRequest } = createClient();
    const query = "query { user { id } }";
    const underlying = new Error("GraphQL Error: User not found");

    mockRequest.mockRejectedValue(underlying);

    await expect(client.query(query)).rejects.toEqual(
      expect.objectContaining({
        kind: "operation",
        message: "The GraphQL operation failed.",
        cause: underlying,
      }),
    );
  });

  test("query() classifies failed fetch TypeError as GraphQLError kind network", async () => {
    const { client, mockRequest } = createClient();
    const query = "query { user { id } }";
    const underlying = new TypeError("Failed to fetch");

    mockRequest.mockRejectedValue(underlying);

    const thrown = await client.query(query).catch(error => error);

    expect(isGraphQLNetworkError(thrown)).toBe(true);
    expect(thrown).toMatchObject({
      kind: "network",
      message: "The GraphQL request failed due to a network error.",
      cause: underlying,
    });
  });

  test("query() classifies non-fetch TypeError as GraphQLError kind operation", async () => {
    const { client, mockRequest } = createClient();
    const query = "query { user { id } }";
    const underlying = new TypeError("undefined is not an object");

    mockRequest.mockRejectedValue(underlying);

    const thrown = await client.query(query).catch(error => error);

    expect(isGraphQLNetworkError(thrown)).toBe(false);
    expect(thrown).toMatchObject({
      kind: "operation",
      message: "The GraphQL operation failed.",
      cause: underlying,
    });
  });

  test("mutate() wraps underlying GraphQL errors in GraphQLError", async () => {
    const { client, mockRequest } = createClient();
    const mutation = "mutation { createUser { id } }";
    const underlying = new Error("GraphQL Error: Validation failed");

    mockRequest.mockRejectedValue(underlying);

    await expect(client.mutate(mutation)).rejects.toEqual(
      expect.objectContaining({
        kind: "operation",
        message: "The GraphQL operation failed.",
        cause: underlying,
      }),
    );
  });

  test("request interceptors run in order before graphQLClient.request", async () => {
    const { client, mockRequest } = createClient();
    const order: string[] = [];

    client.addRequestInterceptor(async context => {
      order.push("a");

      return { ...context, variables: { id: "from-a" } };
    });

    client.addRequestInterceptor(async context => {
      order.push("b");

      return { ...context, variables: { ...context.variables, flag: true } };
    });

    await client.query("query Q($id: ID!) { x }", { id: "1" });

    expect(order).toEqual(["a", "b"]);
    expect(mockRequest).toHaveBeenCalledWith(
      expectedGraphQLRequestCall({
        document: "query Q($id: ID!) { x }",
        variables: { id: "from-a", flag: true },
      }),
    );
  });

  test("response interceptors run in order on successful data", async () => {
    const { client, mockRequest } = createClient();
    mockRequest.mockResolvedValue({ count: 1 });
    const order: string[] = [];

    client.addResponseInterceptor(async data => {
      order.push("first");

      return { ...(data as object), count: 2 } as typeof data;
    });

    client.addResponseInterceptor(async data => {
      order.push("second");

      return { ...(data as object), count: (data as { count: number }).count + 5 };
    });

    const result = await client.query("{ items { id } }");

    expect(order).toEqual(["first", "second"]);
    expect(result).toEqual({ count: 7 });
  });

  test("addRequestInterceptor returns unsubscribe that removes the interceptor; second unsubscribe returns false", async () => {
    const { client, mockRequest } = createClient();
    const spy = vi.fn((context: { document: string }) => context);

    const unsubscribe = client.addRequestInterceptor(spy);

    expect(unsubscribe()).toBe(true);
    expect(unsubscribe()).toBe(false);
    await client.query("{ x }");

    expect(spy).not.toHaveBeenCalled();
    expect(mockRequest).toHaveBeenCalledWith(
      expectedGraphQLRequestCall({ document: "{ x }", variables: undefined }),
    );
  });

  test("addResponseInterceptor returns unsubscribe that removes the interceptor; second unsubscribe returns false", async () => {
    const { client, mockRequest } = createClient();
    mockRequest.mockResolvedValue({ value: 1 });
    const spy = vi.fn(async (data: unknown) => ({
      ...(data as object),
      touched: true,
    }));

    const unsubscribe = client.addResponseInterceptor(spy);

    expect(unsubscribe()).toBe(true);
    expect(unsubscribe()).toBe(false);

    const result = await client.query("{ x }");

    expect(spy).not.toHaveBeenCalled();
    expect(result).toEqual({ value: 1 });
  });

  test("a failing request interceptor rejects with GraphQLError", async () => {
    const { client, mockRequest } = createClient();
    const failure = new Error("auth header missing");

    client.addRequestInterceptor(() => {
      throw failure;
    });

    await expect(client.query("{ x }")).rejects.toEqual(
      expect.objectContaining({
        kind: "request_interceptor",
        message: "A GraphQL request interceptor failed.",
        cause: failure,
      }),
    );

    expect(mockRequest).not.toHaveBeenCalled();
  });

  test("a failing response interceptor rejects with GraphQLError", async () => {
    const { client } = createClient();

    client.addResponseInterceptor(() => {
      throw new GraphQLError({
        kind: "response_interceptor",
        message: "custom",
      });
    });

    await expect(client.query("{ x }")).rejects.toMatchObject({
      kind: "response_interceptor",
      message: "custom",
    });
  });
});

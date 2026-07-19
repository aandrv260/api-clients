import { describe, it, expect, vi } from "vitest";
import { GraphQLError } from "../errors/GraphQLError";
import { isGraphQLError } from "../errors/GraphQLError.guards";
import type { GraphQLOperationContext } from "../models/GraphQLOperationContext";
import {
  GraphQLApiMiddlewareService,
  type GraphQLRequestInterceptor,
  type GraphQLResponseInterceptor,
} from "./GraphQLApiMiddlewareService";

function createOperationContext(
  overrides?: Partial<GraphQLOperationContext>,
): GraphQLOperationContext {
  return {
    document: "{ field }",
    variables: { id: "1" },
    ...overrides,
  };
}

const getThrownError = async (action: () => Promise<unknown>): Promise<unknown> => {
  try {
    await action();
  } catch (error) {
    return error;
  }

  throw new Error("Expected the action to throw.");
};

describe("addRequestInterceptor()", () => {
  it("registers the interceptor so hasRequestInterceptor returns true", () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const interceptor: GraphQLRequestInterceptor = context => context;

    // Assert
    expect(middlewareService.hasRequestInterceptor(interceptor)).toBe(false);

    // Act
    middlewareService.addRequestInterceptor(interceptor);

    // Assert
    expect(middlewareService.hasRequestInterceptor(interceptor)).toBe(true);
  });

  it("returns an unsubscribe that removes the interceptor and returns true, then false on second call", () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const interceptor: GraphQLRequestInterceptor = context => context;
    const unsubscribe = middlewareService.addRequestInterceptor(interceptor);

    // Act & Assert
    expect(unsubscribe()).toBe(true);
    expect(middlewareService.hasRequestInterceptor(interceptor)).toBe(false);

    // Act & Assert
    expect(unsubscribe()).toBe(false);
  });
});

describe("removeRequestInterceptor()", () => {
  it("returns true when the interceptor was registered, then false when removing again", () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const interceptor: GraphQLRequestInterceptor = context => context;

    middlewareService.addRequestInterceptor(interceptor);

    // Act
    const first = middlewareService.removeRequestInterceptor(interceptor);

    // Assert
    expect(first).toBe(true);
    expect(middlewareService.hasRequestInterceptor(interceptor)).toBe(false);

    // Act
    const second = middlewareService.removeRequestInterceptor(interceptor);

    // Assert
    expect(second).toBe(false);
  });

  it("returns false when the interceptor was never registered", () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const interceptor: GraphQLRequestInterceptor = context => context;

    // Act
    const result = middlewareService.removeRequestInterceptor(interceptor);

    // Assert
    expect(result).toBe(false);
  });
});

describe("hasRequestInterceptor()", () => {
  it("returns true only while the interceptor remains registered", () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const interceptor: GraphQLRequestInterceptor = context => context;

    // Assert
    expect(middlewareService.hasRequestInterceptor(interceptor)).toBe(false);

    // Act
    middlewareService.addRequestInterceptor(interceptor);

    // Assert
    expect(middlewareService.hasRequestInterceptor(interceptor)).toBe(true);
  });
});

describe("addResponseInterceptor()", () => {
  it("registers the interceptor so hasResponseInterceptor returns true", () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const interceptor: GraphQLResponseInterceptor = data => data;

    // Assert
    expect(middlewareService.hasResponseInterceptor(interceptor)).toBe(false);

    // Act
    middlewareService.addResponseInterceptor(interceptor);

    // Assert
    expect(middlewareService.hasResponseInterceptor(interceptor)).toBe(true);
  });

  it("returns an unsubscribe that removes the interceptor and returns true, then false on second call", () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const interceptor: GraphQLResponseInterceptor = data => data;
    const unsubscribe = middlewareService.addResponseInterceptor(interceptor);

    // Act & Assert
    expect(unsubscribe()).toBe(true);
    expect(middlewareService.hasResponseInterceptor(interceptor)).toBe(false);

    // Act & Assert
    expect(unsubscribe()).toBe(false);
  });
});

describe("removeResponseInterceptor()", () => {
  it("returns true when the interceptor was registered, then false when removing again", () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const interceptor: GraphQLResponseInterceptor = data => data;

    middlewareService.addResponseInterceptor(interceptor);

    // Act
    const first = middlewareService.removeResponseInterceptor(interceptor);

    // Assert
    expect(first).toBe(true);
    expect(middlewareService.hasResponseInterceptor(interceptor)).toBe(false);

    // Act
    const second = middlewareService.removeResponseInterceptor(interceptor);

    // Assert
    expect(second).toBe(false);
  });

  it("returns false when the interceptor was never registered", () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const interceptor: GraphQLResponseInterceptor = data => data;

    // Act
    const result = middlewareService.removeResponseInterceptor(interceptor);

    // Assert
    expect(result).toBe(false);
  });
});

describe("hasResponseInterceptor()", () => {
  it("returns true only while the interceptor remains registered", () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const interceptor: GraphQLResponseInterceptor = data => data;

    // Assert
    expect(middlewareService.hasResponseInterceptor(interceptor)).toBe(false);

    // Act
    middlewareService.addResponseInterceptor(interceptor);

    // Assert
    expect(middlewareService.hasResponseInterceptor(interceptor)).toBe(true);
  });
});

describe("pipeOperation()", () => {
  it("runs request interceptors in registration order before execute", async () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const order: string[] = [];

    middlewareService.addRequestInterceptor(async context => {
      order.push("first");

      return { ...context, variables: { step: "first" } };
    });

    middlewareService.addRequestInterceptor(async context => {
      order.push("second");

      return { ...context, variables: { step: "second" } };
    });

    const execute = vi.fn(async (context: GraphQLOperationContext) => {
      return { echo: context.variables };
    });

    // Act
    await middlewareService.pipeOperation(createOperationContext(), execute);

    // Assert
    expect(order).toEqual(["first", "second"]);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        document: "{ field }",
        variables: { step: "second" },
      }),
    );
  });

  it("runs response interceptors in registration order after execute resolves", async () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const order: string[] = [];

    middlewareService.addResponseInterceptor(async data => {
      order.push("r1");

      return { ...(data as object), n: 1 };
    });

    middlewareService.addResponseInterceptor(async data => {
      order.push("r2");

      return { ...(data as object), n: (data as { n: number }).n + 2 };
    });

    const execute = vi.fn(async () => ({ n: 0 }));

    // Act
    const result = await middlewareService.pipeOperation(
      createOperationContext(),
      execute,
    );

    // Assert
    expect(order).toEqual(["r1", "r2"]);
    expect(result).toEqual({ n: 3 });
  });

  it("runs the full pipeline: request chain, then execute, then response chain", async () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const trace: string[] = [];

    middlewareService.addRequestInterceptor(async context => {
      trace.push("req");

      return context;
    });

    middlewareService.addResponseInterceptor(async data => {
      trace.push("res");

      return data;
    });

    const execute = vi.fn(async () => {
      trace.push("exec");

      return { ok: true };
    });

    // Act
    await middlewareService.pipeOperation(createOperationContext(), execute);

    // Assert
    expect(trace).toEqual(["req", "exec", "res"]);
  });

  it("passes through when no interceptors are registered", async () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const initial = createOperationContext({ document: "{ ping }" });
    const execute = vi.fn(async (context: GraphQLOperationContext) => ({
      receivedDocument: context.document,
    }));

    // Act
    const result = await middlewareService.pipeOperation(initial, execute);

    // Assert
    expect(execute).toHaveBeenCalledWith(initial);
    expect(result).toEqual({ receivedDocument: "{ ping }" });
  });

  it("supports async request and response interceptors", async () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();

    middlewareService.addRequestInterceptor(async context => {
      await Promise.resolve();

      return { ...context, variables: { async: true } };
    });

    middlewareService.addResponseInterceptor(async data => {
      await Promise.resolve();

      return { ...(data as object), wrapped: true };
    });

    const execute = vi.fn(async () => ({ raw: 1 }));

    // Act
    const result = await middlewareService.pipeOperation(
      createOperationContext(),
      execute,
    );

    // Assert
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { async: true } }),
    );
    expect(result).toEqual({ raw: 1, wrapped: true });
  });

  it("rejects with GraphQLError kind request_interceptor and does not call execute when a request interceptor throws", async () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const failure = new Error("request failed");

    middlewareService.addRequestInterceptor(() => {
      throw failure;
    });

    const execute = vi.fn(async () => ({ data: "never" }));

    // Act
    const error = await getThrownError(() =>
      middlewareService.pipeOperation(createOperationContext(), execute),
    );

    // Assert
    expect(isGraphQLError(error)).toBe(true);
    expect(error).toMatchObject({
      kind: "request_interceptor",
      message: "A GraphQL request interceptor failed.",
      cause: failure,
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("does not run later request interceptors after one throws", async () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const second = vi.fn((context: GraphQLOperationContext) => context);

    middlewareService.addRequestInterceptor(() => {
      throw new Error("stop");
    });

    middlewareService.addRequestInterceptor(second);

    const execute = vi.fn(async () => ({}));

    // Act
    await getThrownError(() =>
      middlewareService.pipeOperation(createOperationContext(), execute),
    );

    // Assert
    expect(second).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects with GraphQLError kind operation when execute throws a generic Error", async () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const underlying = new Error("validation failed");

    const execute = vi.fn(async () => {
      throw underlying;
    });

    // Act
    const error = await getThrownError(() =>
      middlewareService.pipeOperation(createOperationContext(), execute),
    );

    // Assert
    expect(isGraphQLError(error)).toBe(true);
    expect(error).toMatchObject({
      kind: "operation",
      message: "The GraphQL operation failed.",
      cause: underlying,
      operationContext: expect.objectContaining({ document: "{ field }" }),
    });
  });

  it("rejects with GraphQLError kind network when execute throws a fetch-shaped TypeError", async () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const underlying = new TypeError("Failed to fetch");

    const execute = vi.fn(async () => {
      throw underlying;
    });

    // Act
    const error = await getThrownError(() =>
      middlewareService.pipeOperation(createOperationContext(), execute),
    );

    // Assert
    expect(isGraphQLError(error)).toBe(true);
    expect(error).toMatchObject({
      kind: "network",
      message: "The GraphQL request failed due to a network error.",
      cause: underlying,
      operationContext: expect.objectContaining({ document: "{ field }" }),
    });
  });

  it("rejects with GraphQLError kind operation when execute throws a non-fetch TypeError", async () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const underlying = new TypeError(
      "Cannot read properties of undefined (reading 'map')",
    );

    const execute = vi.fn(async () => {
      throw underlying;
    });

    // Act
    const error = await getThrownError(() =>
      middlewareService.pipeOperation(createOperationContext(), execute),
    );

    // Assert
    expect(isGraphQLError(error)).toBe(true);
    expect(error).toMatchObject({
      kind: "operation",
      message: "The GraphQL operation failed.",
      cause: underlying,
      operationContext: expect.objectContaining({ document: "{ field }" }),
    });
  });

  it("rejects with GraphQLError kind unknown when execute throws a non-Error value", async () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const underlying = "thrown string";

    const execute = vi.fn(async () => {
      throw underlying;
    });

    // Act
    const error = await getThrownError(() =>
      middlewareService.pipeOperation(createOperationContext(), execute),
    );

    // Assert
    expect(isGraphQLError(error)).toBe(true);
    expect(error).toMatchObject({
      kind: "unknown",
      message: "An unknown GraphQL error occurred.",
      cause: underlying,
      operationContext: expect.objectContaining({ document: "{ field }" }),
    });
  });

  it("rethrows the same GraphQLError when execute throws GraphQLError", async () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const original = new GraphQLError({
      kind: "operation",
      message: "from server",
    });

    const execute = vi.fn(async () => {
      throw original;
    });

    // Act
    const error = await getThrownError(() =>
      middlewareService.pipeOperation(createOperationContext(), execute),
    );

    // Assert
    expect(error).toBe(original);
  });

  it("rejects with GraphQLError kind response_interceptor when a response interceptor throws", async () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const failure = new Error("response transform failed");

    middlewareService.addResponseInterceptor(() => {
      throw failure;
    });

    const execute = vi.fn(async () => ({ data: 1 }));

    // Act
    const error = await getThrownError(() =>
      middlewareService.pipeOperation(createOperationContext(), execute),
    );

    // Assert
    expect(isGraphQLError(error)).toBe(true);
    expect(error).toMatchObject({
      kind: "response_interceptor",
      message: "A GraphQL response interceptor failed.",
      cause: failure,
    });
  });

  it("does not run later response interceptors after one throws", async () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();
    const second = vi.fn(async (data: unknown) => data);

    middlewareService.addResponseInterceptor(() => {
      throw new Error("stop");
    });

    middlewareService.addResponseInterceptor(second);

    const execute = vi.fn(async () => ({ ok: true }));

    // Act
    await getThrownError(() =>
      middlewareService.pipeOperation(createOperationContext(), execute),
    );

    // Assert
    expect(second).not.toHaveBeenCalled();
  });

  it("includes operationContext on response_interceptor errors matching the final request context", async () => {
    // Arrange
    const middlewareService = new GraphQLApiMiddlewareService();

    middlewareService.addRequestInterceptor(async context => {
      return { ...context, variables: { mutated: true } };
    });

    middlewareService.addResponseInterceptor(() => {
      throw new Error("bad response");
    });

    const execute = vi.fn(async () => ({}));

    // Act
    const error = await getThrownError(() =>
      middlewareService.pipeOperation(createOperationContext(), execute),
    );

    // Assert
    expect(isGraphQLError(error)).toBe(true);
    expect(error).toMatchObject({
      kind: "response_interceptor",
      operationContext: expect.objectContaining({
        document: "{ field }",
        variables: { mutated: true },
      }),
    });
  });
});

import { describe, it, expect } from "vitest";
import { ClientError } from "graphql-request";
import { GraphQLError } from "../errors/GraphQLError";
import { getGraphQLErrorKindForExecuteFailure } from "./GraphQLApiMiddlewareService.utils";

describe("getGraphQLErrorKindForExecuteFailure()", () => {
  it("returns operation for graphql-request ClientError", () => {
    // Arrange
    const clientError = new ClientError(
      {
        status: 400,
        errors: [{ message: "Invalid query" } as never],
      },
      { query: "{}" },
    );

    // Act
    const kind = getGraphQLErrorKindForExecuteFailure(clientError);

    // Assert
    expect(kind).toBe("operation");
  });

  it("returns operation for DOMException AbortError", () => {
    // Arrange
    const abortError = new DOMException("Aborted", "AbortError");

    // Act
    const kind = getGraphQLErrorKindForExecuteFailure(abortError);

    // Assert
    expect(kind).toBe("operation");
  });

  it("returns network for DOMException NetworkError", () => {
    // Arrange
    const networkError = new DOMException("Network", "NetworkError");

    // Act
    const kind = getGraphQLErrorKindForExecuteFailure(networkError);

    // Assert
    expect(kind).toBe("network");
  });

  it.each([
    ["Chromium", "Failed to fetch"],
    ["Firefox", "NetworkError when attempting to fetch resource"],
    ["Safari", "Load failed"],
    ["Undici-style", "fetch failed"],
  ])("returns network for fetch TypeError (%s)", (_label, message) => {
    // Arrange
    const typeError = new TypeError(message);

    // Act
    const kind = getGraphQLErrorKindForExecuteFailure(typeError);

    // Assert
    expect(kind).toBe("network");
  });

  it("returns operation for TypeError that does not look like a fetch failure", () => {
    // Arrange
    const typeError = new TypeError(
      "Cannot read properties of undefined (reading 'x')",
    );

    // Act
    const kind = getGraphQLErrorKindForExecuteFailure(typeError);

    // Assert
    expect(kind).toBe("operation");
  });

  it("returns operation for generic Error", () => {
    // Arrange
    const error = new Error("Something else");

    // Act
    const kind = getGraphQLErrorKindForExecuteFailure(error);

    // Assert
    expect(kind).toBe("operation");
  });

  it("returns operation for GraphQLError instance", () => {
    // Arrange
    const graphQLError = new GraphQLError({
      kind: "operation",
      message: "inner",
    });

    // Act
    const kind = getGraphQLErrorKindForExecuteFailure(graphQLError);

    // Assert
    expect(kind).toBe("operation");
  });

  it.each([
    ["string", "string throw"],
    ["null", null],
    ["undefined", undefined],
    ["plain object", { code: 1 }],
    ["number", 42],
  ])("returns unknown for non-Error cause: %s", (_label, cause) => {
    // Act
    const kind = getGraphQLErrorKindForExecuteFailure(cause);

    // Assert
    expect(kind).toBe("unknown");
  });
});

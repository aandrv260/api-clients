import { ClientError } from "graphql-request";
import { GraphQLError } from "../errors/GraphQLError";
import { isGraphQLError } from "../errors/GraphQLError.guards";
import type { GraphQLErrorKind } from "../errors/GraphQLError.models";
import type { GraphQLOperationContext } from "../models/GraphQLOperationContext";

const GRAPHQL_ERROR_MESSAGES = {
  request_interceptor: "A GraphQL request interceptor failed.",
  response_interceptor: "A GraphQL response interceptor failed.",
  network: "The GraphQL request failed due to a network error.",
  operation: "The GraphQL operation failed.",
  unknown: "An unknown GraphQL error occurred.",
} as const satisfies Record<GraphQLErrorKind, string>;

/**
 * Substrings of {@link TypeError#message} observed from failed `fetch` in major browsers and Undici.
 * Avoid treating every TypeError as network (e.g. bugs or serializer errors).
 */
const FETCH_NETWORK_TYPE_ERROR_MESSAGE_SNIPPETS = [
  "failed to fetch",
  "networkerror when attempting to fetch resource",
  "load failed",
  "fetch failed",
] as const;

const isLikelyFetchNetworkTypeError = (cause: unknown): cause is TypeError => {
  if (!(cause instanceof TypeError)) {
    return false;
  }

  const normalizedMessage = cause.message.trim().toLowerCase();

  for (const snippet of FETCH_NETWORK_TYPE_ERROR_MESSAGE_SNIPPETS) {
    if (normalizedMessage.includes(snippet)) {
      return true;
    }
  }

  return false;
};

/**
 * Maps failures from the underlying transport / `graphql-request` `execute` step.
 * Use {@link isGraphQLNetworkError} / {@link isGraphQLUnknownError} for narrowing in consumers.
 */
export const getGraphQLErrorKindForExecuteFailure = (
  cause: unknown,
): Extract<GraphQLErrorKind, "network" | "operation" | "unknown"> => {
  if (cause instanceof ClientError) {
    return "operation";
  }

  if (typeof DOMException !== "undefined" && cause instanceof DOMException) {
    if (cause.name === "AbortError") {
      return "operation";
    }

    if (cause.name === "NetworkError") {
      return "network";
    }
  }

  if (isLikelyFetchNetworkTypeError(cause)) {
    return "network";
  }

  if (cause instanceof Error) {
    return "operation";
  }

  return "unknown";
};

export const createGraphQLError = ({
  kind,
  cause,
  operationContext,
}: {
  kind: GraphQLErrorKind;
  cause: unknown;
  operationContext?: GraphQLOperationContext;
}) => {
  if (isGraphQLError(cause)) {
    return cause;
  }

  return new GraphQLError({
    kind,
    message: GRAPHQL_ERROR_MESSAGES[kind],
    cause,
    operationContext,
  });
};

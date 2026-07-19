import type { GraphQLOperationContext } from "../models/GraphQLOperationContext";

export type GraphQLErrorKind =
  | "request_interceptor"
  | "response_interceptor"
  | "network"
  | "operation"
  | "unknown";

export interface GraphQLErrorShape {
  isGraphQLError: true;
  kind: GraphQLErrorKind;
  message: string;
  cause?: unknown;
  operationContext?: GraphQLOperationContext;
}

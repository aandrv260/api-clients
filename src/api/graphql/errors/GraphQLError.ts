import type { GraphQLOperationContext } from "../models/GraphQLOperationContext";
import type { GraphQLErrorKind, GraphQLErrorShape } from "./GraphQLError.models";

interface GraphQLErrorOptions extends Omit<GraphQLErrorShape, "isGraphQLError"> {}

export class GraphQLError extends Error {
  public readonly isGraphQLError: boolean;
  public readonly kind: GraphQLErrorKind;
  public override readonly cause?: unknown;
  public readonly operationContext?: GraphQLOperationContext;

  constructor({ kind, message, cause, operationContext }: GraphQLErrorOptions) {
    super(message);

    this.name = "GraphQLError";
    this.isGraphQLError = true;
    this.kind = kind;
    this.cause = cause;
    this.operationContext = operationContext;
  }
}

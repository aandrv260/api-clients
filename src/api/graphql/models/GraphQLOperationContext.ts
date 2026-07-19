import type { GraphQLVariables } from "./GraphQLVariables";

export interface GraphQLOperationContext {
  document: string;
  variables?: GraphQLVariables;
  requestHeaders?: HeadersInit;
  signal?: AbortSignal;
}

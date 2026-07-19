import type { Interceptable } from "../../interceptors/Interceptable";
import type { GraphQLVariables } from "./GraphQLVariables";

export interface GraphQLOperationContext {
  document: string;
  variables?: GraphQLVariables;
  requestHeaders?: HeadersInit;
  signal?: AbortSignal;
}

export interface IGraphQLApiClient
  extends Interceptable<GraphQLOperationContext, unknown> {
  query<
    TData extends object,
    TVariables extends GraphQLVariables = GraphQLVariables,
  >(
    query: string,
    variables?: TVariables,
  ): Promise<TData>;

  mutate<
    TData extends object,
    TVariables extends GraphQLVariables = GraphQLVariables,
  >(
    mutation: string,
    variables?: TVariables,
  ): Promise<TData>;
}

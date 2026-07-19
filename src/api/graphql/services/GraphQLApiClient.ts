import { GraphQLClient } from "graphql-request";
import type { IGraphQLApiClient } from "../models/IGraphQLApiClient";
import type { GraphQLOperationContext } from "../models/GraphQLOperationContext";
import type { GraphQLVariables } from "../models/GraphQLVariables";
import { GraphQLApiMiddlewareService } from "./GraphQLApiMiddlewareService";
import type {
  GraphQLRequestInterceptor,
  GraphQLResponseInterceptor,
} from "./GraphQLApiMiddlewareService.types";
import { getGraphQlApiURL } from "@/env";

export class GraphQLApiClient implements IGraphQLApiClient {
  private readonly middlewareService = new GraphQLApiMiddlewareService();

  constructor(private readonly graphQLClient: GraphQLClient) {}

  private runGraphQLRequest<TData extends object>(
    context: GraphQLOperationContext,
  ): Promise<TData> {
    const { document, variables, requestHeaders, signal } = context;

    return this.graphQLClient.request<TData>({
      document,
      variables,
      requestHeaders,
      signal,
    });
  }

  async query<TData extends object, TVariables extends GraphQLVariables>(
    query: string,
    variables?: TVariables,
  ): Promise<TData> {
    return this.middlewareService.pipeOperation<TData>(
      { document: query, variables },
      context => this.runGraphQLRequest<TData>(context),
    );
  }

  async mutate<TData extends object, TVariables extends GraphQLVariables>(
    mutation: string,
    variables?: TVariables,
  ): Promise<TData> {
    return this.middlewareService.pipeOperation<TData>(
      { document: mutation, variables },
      context => this.runGraphQLRequest<TData>(context),
    );
  }

  public addRequestInterceptor(
    interceptor: GraphQLRequestInterceptor,
  ): () => boolean {
    return this.middlewareService.addRequestInterceptor(interceptor);
  }

  public removeRequestInterceptor(interceptor: GraphQLRequestInterceptor): boolean {
    return this.middlewareService.removeRequestInterceptor(interceptor);
  }

  public addResponseInterceptor(
    interceptor: GraphQLResponseInterceptor,
  ): () => boolean {
    return this.middlewareService.addResponseInterceptor(interceptor);
  }

  public removeResponseInterceptor(
    interceptor: GraphQLResponseInterceptor,
  ): boolean {
    return this.middlewareService.removeResponseInterceptor(interceptor);
  }
}

export const createGraphQlRequestClient = () => {
  return new GraphQLClient(getGraphQlApiURL());
};

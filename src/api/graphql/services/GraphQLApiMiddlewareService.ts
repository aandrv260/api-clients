import type { GraphQLOperationContext } from "../models/GraphQLOperationContext";
import {
  createGraphQLError,
  getGraphQLErrorKindForExecuteFailure,
} from "./GraphQLApiMiddlewareService.utils";
import type {
  GraphQLRequestInterceptor,
  GraphQLResponseInterceptor,
} from "./GraphQLApiMiddlewareService.types";
import { InterceptorRegistry } from "../../interceptors/InterceptorRegistry";

export type {
  GraphQLRequestInterceptor,
  GraphQLResponseInterceptor,
} from "./GraphQLApiMiddlewareService.types";

export class GraphQLApiMiddlewareService {
  private readonly requestRegistry =
    new InterceptorRegistry<GraphQLOperationContext>();

  private readonly responseRegistry = new InterceptorRegistry<unknown>();

  public async pipeOperation<TData extends object>(
    initialContext: GraphQLOperationContext,
    execute: (context: GraphQLOperationContext) => Promise<TData>,
  ): Promise<TData> {
    const context = await this.requestRegistry.run(
      initialContext,
      (error, valueAtFailure) => {
        throw createGraphQLError({
          kind: "request_interceptor",
          cause: error,
          operationContext: valueAtFailure,
        });
      },
    );

    let data: TData;

    try {
      data = await execute(context);
    } catch (error) {
      throw createGraphQLError({
        kind: getGraphQLErrorKindForExecuteFailure(error),
        cause: error,
        operationContext: context,
      });
    }

    const piped = await this.responseRegistry.run(data as unknown, error => {
      throw createGraphQLError({
        kind: "response_interceptor",
        cause: error,
        operationContext: context,
      });
    });

    return piped as TData;
  }

  public addRequestInterceptor(
    interceptor: GraphQLRequestInterceptor,
  ): () => boolean {
    return this.requestRegistry.add(interceptor);
  }

  /**
   * @returns `true` if deleted. `false` otherwise
   */
  public removeRequestInterceptor(interceptor: GraphQLRequestInterceptor): boolean {
    return this.requestRegistry.remove(interceptor);
  }

  public hasRequestInterceptor(interceptor: GraphQLRequestInterceptor): boolean {
    return this.requestRegistry.has(interceptor);
  }

  public addResponseInterceptor(
    interceptor: GraphQLResponseInterceptor,
  ): () => boolean {
    return this.responseRegistry.add(interceptor);
  }

  /**
   * @returns `true` if deleted. `false` otherwise
   */
  public removeResponseInterceptor(
    interceptor: GraphQLResponseInterceptor,
  ): boolean {
    return this.responseRegistry.remove(interceptor);
  }

  public hasResponseInterceptor(interceptor: GraphQLResponseInterceptor): boolean {
    return this.responseRegistry.has(interceptor);
  }
}

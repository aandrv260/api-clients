import type { HttpInterceptor } from "./InterceptorRegistry";

/**
 * HTTP / GraphQL clients that register interceptors as unary transform functions
 * `(value) => value | Promise<value>` for request and response pipeline values.
 */
export interface Interceptable<TRequestPipelineValue, TResponsePipelineValue> {
  addRequestInterceptor(
    interceptor: HttpInterceptor<TRequestPipelineValue>,
  ): () => boolean;
  removeRequestInterceptor(
    interceptor: HttpInterceptor<TRequestPipelineValue>,
  ): boolean;

  addResponseInterceptor(
    interceptor: HttpInterceptor<TResponsePipelineValue>,
  ): () => boolean;
  removeResponseInterceptor(
    interceptor: HttpInterceptor<TResponsePipelineValue>,
  ): boolean;
}

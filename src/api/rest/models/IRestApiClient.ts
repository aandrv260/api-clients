import type { HttpInterceptor } from "../../interceptors/InterceptorRegistry";
import type { HttpHeaders, QueryParams } from "./http.models";
import type { HttpRequest } from "./HttpRequest";
import type { HttpResponse } from "./HttpResponse";
import type { Interceptable } from "../../interceptors/Interceptable";

interface FetcherConfig {
  headers?: HttpHeaders;
  query?: QueryParams;
}

export interface GetConfig extends FetcherConfig {}

export interface PostConfig extends FetcherConfig {
  body?: Record<string, unknown>;
}

export interface PutConfig extends FetcherConfig {
  body?: Record<string, unknown>;
}

export interface DeleteConfig extends FetcherConfig {}

export interface IRestApiClient
  extends Interceptable<HttpRequest, HttpResponse<unknown>> {
  get<T>(endpoint: string, config?: GetConfig): Promise<HttpResponse<T>>;
  post<T>(endpoint: string, config?: PostConfig): Promise<HttpResponse<T>>;
  put<T>(endpoint: string, config?: PutConfig): Promise<HttpResponse<T>>;
  delete<T>(endpoint: string, config?: DeleteConfig): Promise<HttpResponse<T>>;
}

export type RequestInterceptor = HttpInterceptor<HttpRequest>;
export type ResponseInterceptor<T = unknown> = HttpInterceptor<HttpResponse<T>>;

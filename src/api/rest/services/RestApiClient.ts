import type {
  GetConfig,
  PostConfig,
  PutConfig,
  DeleteConfig,
  IRestApiClient,
  ResponseInterceptor,
} from "../models/IRestApiClient";
import {
  RestApiMiddlewareService,
  type RequestInterceptor,
} from "./RestApiMiddlewareService";
import type { HttpRequest } from "../models/HttpRequest";
import type {
  HttpHeaders,
  HttpMethod,
  QueryParams,
  RequestBody,
} from "../models/http.models";
import {
  DEFAULT_HEADERS,
  getCredentialsProperty,
  getFinalURL,
  isSuccessStatusCode,
  canHttpMethodHaveBody,
} from "./RestApiClient.utils";
import type { HttpResponse } from "../models/HttpResponse";
import { HttpError } from "../errors/HttpError";
import { isHttpError } from "../errors/HttpError.guards";

interface PipeConfig {
  endpoint: string;
  method: HttpMethod;
  headers?: HttpHeaders;
  query?: QueryParams;
  body?: RequestBody;
}

interface Config {
  baseURL: string;
  withCredentials: boolean;
}

export class RestApiClient implements IRestApiClient {
  private readonly middlewareService = new RestApiMiddlewareService();

  constructor(private readonly config: Config) {}

  public async get<T>(
    endpoint: string,
    { headers, query }: GetConfig = {},
  ): Promise<HttpResponse<T>> {
    return await this.sendRequest<T>({
      method: "GET",
      endpoint,
      headers,
      query,
    });
  }

  public async post<T>(
    endpoint: string,
    { headers, query, body }: PostConfig = {},
  ): Promise<HttpResponse<T>> {
    return await this.sendRequest<T>({
      method: "POST",
      endpoint,
      headers,
      query,
      body,
    });
  }

  public async put<T>(
    endpoint: string,
    { headers, body, query }: PutConfig = {},
  ): Promise<HttpResponse<T>> {
    return await this.sendRequest<T>({
      method: "PUT",
      endpoint,
      headers,
      query,
      body,
    });
  }

  public async delete<T>(
    endpoint: string,
    { headers, query }: DeleteConfig = {},
  ): Promise<HttpResponse<T>> {
    return await this.sendRequest<T>({
      method: "DELETE",
      endpoint,
      headers,
      query,
    });
  }

  private async sendRequest<TResponse>({
    endpoint,
    headers = {},
    query,
    body,
    method,
  }: PipeConfig) {
    const initialRequest: HttpRequest = {
      url: getFinalURL(this.config.baseURL, endpoint, query),
      headers: { ...DEFAULT_HEADERS, ...headers },
      method,
      withCredentials: this.config.withCredentials,
      body,
    };

    try {
      const { response, finalRequest } =
        await this.middlewareService.pipe<TResponse>(initialRequest, request =>
          fetch(request.url, {
            headers: request.headers,
            method: request.method,
            credentials: getCredentialsProperty(request.withCredentials),
            body:
              request.body && canHttpMethodHaveBody(request.method)
                ? JSON.stringify(request.body)
                : undefined,
          }),
        );

      if (!isSuccessStatusCode(response.status)) {
        throw new HttpError({
          kind: "http",
          message: `The request failed with status ${response.status}.`,
          request: finalRequest,
          response,
          status: response.status,
          statusText: response.statusText,
        });
      }

      return response;
    } catch (error) {
      if (isHttpError(error)) {
        throw error;
      }

      throw new HttpError({
        kind: "unknown",
        message: "An unknown HTTP error occurred.",
        cause: error,
        request: initialRequest,
      });
    }
  }

  public addRequestInterceptor(interceptor: RequestInterceptor): () => boolean {
    return this.middlewareService.addRequestInterceptor(interceptor);
  }

  public removeRequestInterceptor(interceptor: RequestInterceptor): boolean {
    return this.middlewareService.removeRequestInterceptor(interceptor);
  }

  public addResponseInterceptor(interceptor: ResponseInterceptor): () => boolean {
    return this.middlewareService.addResponseInterceptor(interceptor);
  }

  public removeResponseInterceptor(interceptor: ResponseInterceptor): boolean {
    return this.middlewareService.removeResponseInterceptor(interceptor);
  }
}

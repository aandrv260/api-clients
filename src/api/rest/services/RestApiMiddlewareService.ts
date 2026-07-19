import type { HttpRequest } from "../models/HttpRequest";
import type { HttpResponse } from "../models/HttpResponse";
import type {
  RequestInterceptor,
  ResponseInterceptor,
} from "../models/IRestApiClient";

export type { RequestInterceptor, ResponseInterceptor };
import type { HttpStatusCode } from "../models/http.models";
import {
  createHttpError,
  parseResponseData,
} from "./RestApiMiddlewareService.utils";
import { InterceptorRegistry } from "../../interceptors/InterceptorRegistry";

const getHeadersEntries = (headers: Headers): Record<string, string> => {
  return Object.fromEntries(headers.entries());
};

export class RestApiMiddlewareService {
  private readonly requestRegistry = new InterceptorRegistry<HttpRequest>();
  private readonly responseRegistry = new InterceptorRegistry<
    HttpResponse<unknown>
  >();

  private async pipeRequest(initialRequest: HttpRequest): Promise<HttpRequest> {
    return this.requestRegistry.run(initialRequest, (error, valueAtFailure) => {
      throw createHttpError({
        kind: "request_interceptor",
        cause: error,
        request: valueAtFailure,
      });
    });
  }

  private async pipeResponse<T>(resp: Response): Promise<HttpResponse<T>> {
    let currentResponse: HttpResponse<T>;

    try {
      currentResponse = {
        status: resp.status as HttpStatusCode,
        statusText: resp.statusText,
        headers: getHeadersEntries(resp.headers),
        data: await parseResponseData<T>(resp),
      };
    } catch (error) {
      throw createHttpError({
        kind: "response_parse",
        cause: error,
        status: resp.status as HttpStatusCode,
        statusText: resp.statusText,
      });
    }

    const piped = await this.responseRegistry.run(
      currentResponse as HttpResponse<unknown>,
      (error, valueAtFailure) => {
        throw createHttpError({
          kind: "response_interceptor",
          cause: error,
          response: valueAtFailure,
          status: valueAtFailure.status,
          statusText: valueAtFailure.statusText,
        });
      },
    );

    return piped as HttpResponse<T>;
  }

  public async pipe<T>(
    initialRequest: HttpRequest,
    fetcherFn: (request: HttpRequest) => Promise<Response>,
  ) {
    const request = await this.pipeRequest(initialRequest);
    let response: Response;

    try {
      response = await fetcherFn(request);
    } catch (error) {
      throw createHttpError({
        kind: "network",
        cause: error,
        request,
      });
    }

    return {
      response: await this.pipeResponse<T>(response),
      finalRequest: request,
    };
  }

  public addRequestInterceptor(interceptor: RequestInterceptor): () => boolean {
    return this.requestRegistry.add(interceptor);
  }

  /**
   * @returns `true` if deleted. `false` otherwise
   */
  public removeRequestInterceptor(interceptor: RequestInterceptor): boolean {
    return this.requestRegistry.remove(interceptor);
  }

  public hasRequestInterceptor(interceptor: RequestInterceptor): boolean {
    return this.requestRegistry.has(interceptor);
  }

  public addResponseInterceptor(interceptor: ResponseInterceptor): () => boolean {
    return this.responseRegistry.add(interceptor);
  }

  /**
   * @returns `true` if deleted. `false` otherwise
   */
  public removeResponseInterceptor(interceptor: ResponseInterceptor): boolean {
    return this.responseRegistry.remove(interceptor);
  }

  public hasResponseInterceptor(interceptor: ResponseInterceptor): boolean {
    return this.responseRegistry.has(interceptor);
  }
}

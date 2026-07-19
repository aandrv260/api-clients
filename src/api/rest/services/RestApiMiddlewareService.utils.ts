import { HttpError } from "../errors/HttpError";
import { isHttpError } from "../errors/HttpError.guards";
import type { HttpResponse } from "../models/HttpResponse";
import type { HttpRequest } from "../models/HttpRequest";
import type { HttpStatusCode } from "../models/http.models";

const EMPTY_BODY_STATUS_CODES = new Set([204, 205, 304]);

const getHttpErrorMessage = (kind: HttpError["kind"]): string => {
  const messages = {
    network: "The network request failed.",
    request_interceptor: "A request interceptor failed.",
    response_interceptor: "A response interceptor failed.",
    response_parse: "The response body could not be parsed.",
    http: "The request failed with a non-success status code.",
    unknown: "An unknown HTTP error occurred.",
  };

  return messages[kind];
};

const isJsonContentType = (contentType: string): boolean => {
  return contentType.includes("application/json") || contentType.includes("+json");
};

export const parseResponseData = async <T>(response: Response): Promise<T> => {
  if (EMPTY_BODY_STATUS_CODES.has(response.status)) {
    return undefined as T;
  }

  const contentLength = response.headers.get("content-length");

  if (contentLength === "0") {
    return undefined as T;
  }

  const responseText = await response.text();

  if (responseText === "") {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (!isJsonContentType(contentType)) {
    return responseText as T;
  }

  return JSON.parse(responseText) as T;
};

export const createHttpError = ({
  kind,
  cause,
  request,
  response,
  status,
  statusText,
}: {
  kind: HttpError["kind"];
  cause: unknown;
  request?: HttpRequest;
  response?: HttpResponse<unknown>;
  status?: HttpStatusCode;
  statusText?: string;
}) => {
  if (isHttpError(cause)) {
    return cause;
  }

  return new HttpError({
    kind,
    message: getHttpErrorMessage(kind),
    cause,
    request,
    response,
    status,
    statusText,
  });
};

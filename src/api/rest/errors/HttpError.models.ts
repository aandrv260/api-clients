import type { HttpRequest } from "../models/HttpRequest";
import type { HttpResponse } from "../models/HttpResponse";
import type { HttpStatusCode } from "../models/http.models";

export type HttpErrorKind =
  | "network"
  | "http"
  | "request_interceptor"
  | "response_interceptor"
  | "response_parse"
  | "unknown";

export interface HttpErrorShape {
  isHttpError: true;
  kind: HttpErrorKind;
  message: string;
  cause?: unknown;
  request?: HttpRequest;
  response?: HttpResponse<unknown>;
  status?: HttpStatusCode;
  statusText?: string;
}

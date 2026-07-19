import type { HttpRequest } from "../models/HttpRequest";
import type { HttpResponse } from "../models/HttpResponse";
import type { HttpStatusCode } from "../models/http.models";
import type { HttpErrorKind, HttpErrorShape } from "./HttpError.models";

interface HttpErrorOptions extends Omit<HttpErrorShape, "isHttpError"> {}

export class HttpError extends Error {
  public readonly isHttpError: boolean;
  public readonly kind: HttpErrorKind;
  public override readonly cause?: unknown;
  public readonly request?: HttpRequest;
  public readonly response?: HttpResponse<unknown>;
  public readonly status?: HttpStatusCode;
  public readonly statusText?: string;

  constructor({
    kind,
    message,
    cause,
    request,
    response,
    status,
    statusText,
  }: HttpErrorOptions) {
    super(message);

    this.name = "HttpError";
    this.isHttpError = true;
    this.kind = kind;
    this.cause = cause;
    this.request = request;
    this.response = response;
    this.status = status;
    this.statusText = statusText;
  }
}

import type { HttpErrorKind, HttpErrorShape } from "./HttpError.models";

const isHttpErrorKind = (value: unknown): value is HttpErrorKind => {
  return (
    value === "network" ||
    value === "http" ||
    value === "request_interceptor" ||
    value === "response_interceptor" ||
    value === "response_parse" ||
    value === "unknown"
  );
};

export const isHttpError = (error: unknown): error is HttpErrorShape => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if (!("isHttpError" in error) || error.isHttpError !== true) {
    return false;
  }

  if (!("message" in error) || typeof error.message !== "string") {
    return false;
  }

  if (!("kind" in error) || !isHttpErrorKind(error.kind)) {
    return false;
  }

  return true;
};

export const isNetworkError = (error: unknown): error is HttpErrorShape => {
  return isHttpError(error) && error.kind === "network";
};

export const isHttpStatusError = (error: unknown): error is HttpErrorShape => {
  return isHttpError(error) && error.kind === "http";
};

export const isRequestInterceptorError = (
  error: unknown,
): error is HttpErrorShape => {
  return isHttpError(error) && error.kind === "request_interceptor";
};

export const isResponseInterceptorError = (
  error: unknown,
): error is HttpErrorShape => {
  return isHttpError(error) && error.kind === "response_interceptor";
};

export const isResponseParseError = (error: unknown): error is HttpErrorShape => {
  return isHttpError(error) && error.kind === "response_parse";
};

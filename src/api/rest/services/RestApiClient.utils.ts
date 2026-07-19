import { getObjectEntries } from "@/common/object.utils";
import type {
  HttpHeaders,
  HttpMethod,
  HttpStatusCode,
  QueryParams,
} from "../models/http.models";

export const getFinalURL = (
  baseURL: string,
  endpoint: string,
  query?: QueryParams,
): string => {
  const url = new URL(`${baseURL}${endpoint}`);

  if (!query) {
    return url.toString();
  }

  for (const [key, value] of getObjectEntries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item));
      }

      continue;
    }

    url.searchParams.append(key, value.toString());
  }

  return url.toString();
};

export const getCredentialsProperty = (
  withCredentials: boolean,
): "include" | "omit" => {
  return withCredentials ? "include" : "omit";
};

export const isSuccessStatusCode = (status: HttpStatusCode): boolean => {
  return status >= 200 && status < 300;
};

export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
} as const satisfies HttpHeaders;

export const canHttpMethodHaveBody = (method: HttpMethod): boolean =>
  method === "POST" || method === "PUT";

import type { HttpHeaders, HttpMethod, RequestBody } from "./http.models";

export interface HttpRequest {
  url: string;
  headers: HttpHeaders;
  withCredentials: boolean;
  method: HttpMethod;
  body?: RequestBody;
}

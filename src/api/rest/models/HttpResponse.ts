import type { HttpStatusCode } from "./http.models";

export interface HttpResponse<T = unknown> {
  data: T;
  status: HttpStatusCode;
  statusText: string;
  headers: Record<string, string>;
}

import { isHttpError } from "../errors/HttpError.guards";
import type { HttpRequest } from "../models/HttpRequest";
import {
  RestApiMiddlewareService,
  type RequestInterceptor,
  type ResponseInterceptor,
} from "./RestApiMiddlewareService";

function createRequest(overrides?: Partial<HttpRequest>): HttpRequest {
  return {
    url: "https://api.example.com/test",
    headers: {},
    withCredentials: false,
    method: "GET",
    ...overrides,
  };
}

function createFetchResponse(
  data: unknown,
  {
    status = 200,
    headers = { "content-type": "application/json" },
  }: {
    status?: number;
    headers?: Record<string, string>;
  } = {},
): Response {
  const responseText = typeof data === "string" ? data : JSON.stringify(data);

  return {
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: new Headers(headers),
    text: () => Promise.resolve(responseText),
  } as Response;
}

const getThrownError = async (action: () => Promise<unknown>): Promise<unknown> => {
  try {
    await action();
  } catch (error) {
    return error;
  }

  throw new Error("Expected the action to throw.");
};

describe("addRequestInterceptor()", () => {
  it("adds a request interceptor successfully", () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const interceptor: RequestInterceptor = req => req;

    // Assert
    expect(middlewareService.hasRequestInterceptor(interceptor)).toBe(false);

    // Act
    middlewareService.addRequestInterceptor(interceptor);

    // Assert
    expect(middlewareService.hasRequestInterceptor(interceptor)).toBe(true);
  });

  it("removes a request interceptor successfully by calling the callback returned from the method", () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const interceptor: RequestInterceptor = req => req;
    const remove = middlewareService.addRequestInterceptor(interceptor);

    // Act & Assert
    expect(remove()).toBe(true);
    expect(middlewareService.hasRequestInterceptor(interceptor)).toBe(false);

    // Act & Assert
    expect(remove()).toBe(false);
  });
});

describe("removeRequestInterceptor()", () => {
  it("removes a request interceptor successfully and returns true to indicate the interceptor is removed", () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const interceptor: RequestInterceptor = req => req;
    middlewareService.addRequestInterceptor(interceptor);

    // Act
    const result = middlewareService.removeRequestInterceptor(interceptor);

    // Assert
    expect(result).toBe(true);
    expect(middlewareService.hasRequestInterceptor(interceptor)).toBe(false);

    // Act
    const remove2Result = middlewareService.removeRequestInterceptor(interceptor);

    // Assert
    expect(remove2Result).toBe(false);
  });

  it("returns false if an interceptor is not deleted because it was not found", () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const interceptor: RequestInterceptor = req => req;

    // Act
    const result = middlewareService.removeRequestInterceptor(interceptor);

    // Assert
    expect(result).toBe(false);
  });
});

describe("hasRequestInterceptor()", () => {
  it("returns true if the interceptor is already registered", () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const interceptor: RequestInterceptor = req => req;
    middlewareService.addRequestInterceptor(interceptor);

    // Act
    const result = middlewareService.hasRequestInterceptor(interceptor);

    // Assert
    expect(result).toBe(true);
  });

  it("returns false if the interceptor is not registered", () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const interceptor: RequestInterceptor = req => req;

    // Act
    const result = middlewareService.hasRequestInterceptor(interceptor);

    // Assert
    expect(result).toBe(false);
  });
});

describe("addResponseInterceptor()", () => {
  it("adds a response interceptor successfully", () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const interceptor: ResponseInterceptor = res => res;

    // Act
    middlewareService.addResponseInterceptor(interceptor);

    // Assert
    expect(middlewareService.hasResponseInterceptor(interceptor)).toBe(true);
  });

  it("removes a response interceptor successfully by calling the callback returned from the method", () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const interceptor: ResponseInterceptor = res => res;
    const remove = middlewareService.addResponseInterceptor(interceptor);

    // Act
    const result = remove();

    // Assert
    expect(result).toBe(true);
    expect(middlewareService.hasResponseInterceptor(interceptor)).toBe(false);
  });
});

describe("removeResponseInterceptor()", () => {
  it("removes a response interceptor successfully and returns true to indicate the interceptor is removed", () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const interceptor: ResponseInterceptor = res => res;
    middlewareService.addResponseInterceptor(interceptor);

    // Act
    const result = middlewareService.removeResponseInterceptor(interceptor);

    // Assert
    expect(result).toBe(true);
    expect(middlewareService.hasResponseInterceptor(interceptor)).toBe(false);
  });

  it("returns false if an interceptor is not deleted because it was not found", () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const interceptor: ResponseInterceptor = res => res;

    // Act
    const result = middlewareService.removeResponseInterceptor(interceptor);

    // Assert
    expect(result).toBe(false);
  });
});

describe("hasResponseInterceptor()", () => {
  it("returns true if the interceptor is already registered", () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const interceptor: ResponseInterceptor = res => res;
    middlewareService.addResponseInterceptor(interceptor);

    // Act
    const result = middlewareService.hasResponseInterceptor(interceptor);

    // Assert
    expect(result).toBe(true);
  });

  it("returns false if the interceptor is not registered", () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const interceptor: ResponseInterceptor = res => res;

    // Act
    const result = middlewareService.hasResponseInterceptor(interceptor);

    // Assert
    expect(result).toBe(false);
  });
});

describe("pipe()", () => {
  it("runs request interceptors in registration order before calling the fetcher", async () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const callOrder: number[] = [];

    middlewareService.addRequestInterceptor(req => {
      callOrder.push(1);
      return req;
    });

    middlewareService.addRequestInterceptor(req => {
      callOrder.push(2);
      return req;
    });

    const fetcherFn = vi.fn().mockResolvedValue(createFetchResponse({}));

    // Act
    await middlewareService.pipe(createRequest(), fetcherFn);

    // Assert
    expect(callOrder).toEqual([1, 2]);
    expect(fetcherFn).toHaveBeenCalledOnce();
  });

  it("runs response interceptors in registration order after the fetcher responds", async () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const callOrder: number[] = [];

    middlewareService.addResponseInterceptor(res => {
      callOrder.push(1);
      return res;
    });

    middlewareService.addResponseInterceptor(res => {
      callOrder.push(2);
      return res;
    });

    const fetcherFn = vi.fn().mockResolvedValue(createFetchResponse({}));

    // Act
    await middlewareService.pipe(createRequest(), fetcherFn);

    // Assert
    expect(callOrder).toEqual([1, 2]);
  });

  it("runs the full pipeline: request interceptors → fetch → response interceptors", async () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const callOrder: string[] = [];

    middlewareService.addRequestInterceptor(req => {
      callOrder.push("request");
      return req;
    });

    middlewareService.addResponseInterceptor(res => {
      callOrder.push("response");
      return res;
    });

    const fetchReturnedValue = createFetchResponse({});

    const fetcherFn = vi.fn().mockImplementation(() => {
      callOrder.push("fetch");
      return Promise.resolve(fetchReturnedValue);
    });

    // Act
    const result = await middlewareService.pipe(createRequest(), fetcherFn);

    // Assert
    expect(callOrder).toEqual(["request", "fetch", "response"]);
    expect(result.response.status).toBe(200);
    expect(result.response.data).toEqual({});
    expect(result.response.headers).toEqual(
      Object.fromEntries(fetchReturnedValue.headers.entries()),
    );
    expect(result.response.statusText).toBe(fetchReturnedValue.statusText);
    expect(result.finalRequest).toEqual(createRequest());
  });

  it("passes the transformed request returned from the last request interceptor to the fetcher", async () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();

    middlewareService.addRequestInterceptor(req => ({
      ...req,
      headers: { ...req.headers, "X-First": "1" },
    }));

    middlewareService.addRequestInterceptor(req => ({
      ...req,
      headers: { ...req.headers, "X-Second": "2" },
    }));

    const fetcherFn = vi.fn().mockResolvedValue(createFetchResponse({}));

    // Act
    await middlewareService.pipe(createRequest(), fetcherFn);

    // Assert
    const passedRequest = fetcherFn.mock.calls[0][0] as HttpRequest;
    expect(passedRequest.headers).toEqual({ "X-First": "1", "X-Second": "2" });
  });

  it("works with no interceptors registered (passthrough)", async () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const request = createRequest();

    const responseData = { id: 1 };
    const fetcherFn = vi.fn().mockResolvedValue(createFetchResponse(responseData));

    // Act
    const result = await middlewareService.pipe<{ id: number }>(request, fetcherFn);

    // Assert
    expect(fetcherFn).toHaveBeenCalledWith(request);
    expect(result.response.data).toEqual(responseData);
    expect(result.response.status).toBe(200);
    expect(result.finalRequest).toEqual(request);
  });

  it("returns undefined data for a 204 response with no body", async () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const fetcherFn = vi.fn().mockResolvedValue(
      createFetchResponse("", {
        status: 204,
        headers: {},
      }),
    );

    // Act
    const result = await middlewareService.pipe<undefined>(
      createRequest(),
      fetcherFn,
    );

    // Assert
    expect(result.response.status).toBe(204);
    expect(result.response.data).toBeUndefined();
  });

  it("returns plain text data for non-json responses", async () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const responseBody = "Something went wrong";
    const fetcherFn = vi.fn().mockResolvedValue(
      createFetchResponse(responseBody, {
        headers: { "content-type": "text/plain" },
      }),
    );

    // Act
    const result = await middlewareService.pipe<string>(createRequest(), fetcherFn);

    // Assert
    expect(result.response.data).toBe(responseBody);
  });

  it("supports async request interceptors", async () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    middlewareService.addRequestInterceptor(async req => ({
      ...req,
      headers: { ...req.headers, Authorization: "Bearer token" },
    }));

    const fetcherFn = vi.fn().mockResolvedValue(createFetchResponse({}));

    // Act
    await middlewareService.pipe(createRequest(), fetcherFn);

    // Assert
    const passedRequest = fetcherFn.mock.calls[0][0] as HttpRequest;
    expect(passedRequest.headers).toEqual({ Authorization: "Bearer token" });
  });

  it("supports async response interceptors", async () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();

    middlewareService.addResponseInterceptor(async res => ({
      ...res,
      headers: { ...res.headers, "X-Custom": "added" },
    }));

    const fetcherFn = vi.fn().mockResolvedValue(createFetchResponse({ ok: true }));

    // Act
    const result = await middlewareService.pipe(createRequest(), fetcherFn);

    // Assert
    expect(result.response.headers["X-Custom"]).toBe("added");
  });

  it("throws HttpError with kind 'request_interceptor' when request middleware throws", async () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const requestInterceptorError = new Error("Request middleware failed");
    const fetcherFn = vi.fn();

    middlewareService.addRequestInterceptor(() => {
      throw requestInterceptorError;
    });

    // Act
    const error = await getThrownError(() =>
      middlewareService.pipe(createRequest(), fetcherFn),
    );

    // Assert
    expect(isHttpError(error)).toBe(true);

    if (!isHttpError(error)) {
      throw new Error("Expected HttpError.");
    }

    expect(error.kind).toBe("request_interceptor");
  });

  it("stops the request pipeline when request middleware throws and does not call the next request middleware or the fetcher", async () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const nextRequestInterceptor = vi.fn(req => req);
    const fetcherFn = vi.fn();

    middlewareService.addRequestInterceptor(() => {
      throw new Error("Request middleware failed");
    });

    middlewareService.addRequestInterceptor(nextRequestInterceptor);

    // Act
    await getThrownError(() => middlewareService.pipe(createRequest(), fetcherFn));

    // Assert
    expect(nextRequestInterceptor).not.toHaveBeenCalled();
    expect(fetcherFn).not.toHaveBeenCalled();
  });

  it("throws HttpError with kind 'network' when the fetcher throws", async () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const fetcherFn = vi.fn().mockRejectedValue(new Error("Network failed"));

    // Act
    const error = await getThrownError(() =>
      middlewareService.pipe(createRequest(), fetcherFn),
    );

    // Assert
    expect(isHttpError(error)).toBe(true);

    if (!isHttpError(error)) {
      throw new Error("Expected HttpError.");
    }

    expect(error.kind).toBe("network");
  });

  it("throws HttpError with kind 'response_parse' when parsing the response body fails", async () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const fetcherFn = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      text: () => Promise.resolve("Invalid JSON"),
    } as Response);

    // Act
    const error = await getThrownError(() =>
      middlewareService.pipe(createRequest(), fetcherFn),
    );

    // Assert
    expect(isHttpError(error)).toBe(true);

    if (!isHttpError(error)) {
      throw new Error("Expected HttpError.");
    }

    expect(error.kind).toBe("response_parse");
  });

  it("throws HttpError with kind 'response_interceptor' when response middleware throws", async () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const fetcherFn = vi.fn().mockResolvedValue(createFetchResponse({ ok: true }));

    middlewareService.addResponseInterceptor(() => {
      throw new Error("Response middleware failed");
    });

    // Act
    const error = await getThrownError(() =>
      middlewareService.pipe(createRequest(), fetcherFn),
    );

    // Assert
    expect(isHttpError(error)).toBe(true);

    if (!isHttpError(error)) {
      throw new Error("Expected HttpError.");
    }

    expect(error.kind).toBe("response_interceptor");
  });

  it("stops the response middleware chain when response middleware throws and does not call the next response middleware", async () => {
    // Arrange
    const middlewareService = new RestApiMiddlewareService();
    const nextResponseInterceptor = vi.fn(res => res);
    const fetcherFn = vi.fn().mockResolvedValue(createFetchResponse({ ok: true }));

    middlewareService.addResponseInterceptor(() => {
      throw new Error("Response middleware failed");
    });

    middlewareService.addResponseInterceptor(nextResponseInterceptor);

    // Act
    await getThrownError(() => middlewareService.pipe(createRequest(), fetcherFn));

    // Assert
    expect(nextResponseInterceptor).not.toHaveBeenCalled();
  });
});

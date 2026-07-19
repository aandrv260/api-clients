import { afterEach, describe, expect, it, vi } from "vitest";
import { isHttpError } from "../errors/HttpError.guards";
import type { HttpResponse } from "../models/HttpResponse";
import { RestApiClient } from "./RestApiClient";

const createHttpResponse = (data: unknown, init: ResponseInit = {}): Response => {
  return new Response(JSON.stringify(data), {
    status: 200,
    statusText: "OK",
    headers: {
      "Content-Type": "application/json",
      "X-Test": "yes",
    },
    ...init,
  });
};

const createRestApiClient = ({
  withCredentials = true,
}: {
  withCredentials?: boolean;
} = {}) => {
  return new RestApiClient({
    baseURL: "https://api.example.com",
    withCredentials,
  });
};

const mockFetch = (data: unknown = { ok: true }, init: ResponseInit = {}) => {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => createHttpResponse(data, init));
};

const createResponseWithRejectedJson = (): Response => {
  return {
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    text: () => Promise.resolve("Invalid JSON"),
  } as Response;
};

const getThrownError = async (action: () => Promise<unknown>): Promise<unknown> => {
  try {
    await action();
  } catch (error) {
    return error;
  }

  throw new Error("Expected the action to throw.");
};

const getTasks = (restApiClient: RestApiClient) => {
  return restApiClient.get("/tasks");
};

const postTasks = (restApiClient: RestApiClient) => {
  return restApiClient.post("/tasks");
};

const putTask = (restApiClient: RestApiClient) => {
  return restApiClient.put("/tasks/task-1");
};

const deleteTask = (restApiClient: RestApiClient) => {
  return restApiClient.delete("/tasks/task-1");
};

const invokeGetWithOptions = (restApiClient: RestApiClient, options?: unknown) => {
  return restApiClient.get("/tasks", options as Parameters<RestApiClient["get"]>[1]);
};

const invokePostWithOptions = (restApiClient: RestApiClient, options?: unknown) => {
  return restApiClient.post(
    "/tasks",
    options as Parameters<RestApiClient["post"]>[1],
  );
};

const invokePutWithOptions = (restApiClient: RestApiClient, options?: unknown) => {
  return restApiClient.put(
    "/tasks/task-1",
    options as Parameters<RestApiClient["put"]>[1],
  );
};

const invokeDeleteWithOptions = (
  restApiClient: RestApiClient,
  options?: unknown,
) => {
  return restApiClient.delete(
    "/tasks/task-1",
    options as Parameters<RestApiClient["delete"]>[1],
  );
};

const invokeGetWithInvalidBody = (restApiClient: RestApiClient) => {
  return (
    restApiClient.get as unknown as (
      endpoint: string,
      options?: {
        body?: Record<string, unknown>;
      },
    ) => Promise<HttpResponse<unknown>>
  )("/tasks", {
    body: {
      title: "Ignored body",
    },
  });
};

const invokeDeleteWithInvalidBody = (restApiClient: RestApiClient) => {
  return (
    restApiClient.delete as unknown as (
      endpoint: string,
      options?: {
        body?: Record<string, unknown>;
      },
    ) => Promise<HttpResponse<unknown>>
  )("/tasks/task-1", {
    body: {
      title: "Ignored body",
    },
  });
};

const allMethodInvocations = [
  {
    methodName: "get()",
    invoke: getTasks,
  },
  {
    methodName: "post()",
    invoke: postTasks,
  },
  {
    methodName: "put()",
    invoke: putTask,
  },
  {
    methodName: "delete()",
    invoke: deleteTask,
  },
] as const;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("public request contract", () => {
  it.each([
    {
      methodName: "get()",
      expectedMethod: "GET",
      expectedUrl: "https://api.example.com/tasks",
      invoke: getTasks,
    },
    {
      methodName: "post()",
      expectedMethod: "POST",
      expectedUrl: "https://api.example.com/tasks",
      invoke: postTasks,
    },
    {
      methodName: "put()",
      expectedMethod: "PUT",
      expectedUrl: "https://api.example.com/tasks/task-1",
      invoke: putTask,
    },
    {
      methodName: "delete()",
      expectedMethod: "DELETE",
      expectedUrl: "https://api.example.com/tasks/task-1",
      invoke: deleteTask,
    },
  ])(
    "$methodName requests a resource from the given endpoint",
    async ({ expectedMethod, expectedUrl, invoke, methodName }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      const fetchSpy = mockFetch({ methodName });

      // Act
      await invoke(restApiClient);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: expectedMethod,
        }),
      );
    },
  );

  it.each([
    {
      methodName: "get()",
      expectedUrlWithHeadersAndQuery: "https://api.example.com/tasks?status=open",
      invokeWithOptions: invokeGetWithOptions,
      requestOptionsWithHeadersAndQuery: {
        headers: {
          Authorization: "Bearer token",
        },
        query: {
          status: "open",
        },
      },
    },
    {
      methodName: "post()",
      expectedUrlWithHeadersAndQuery: "https://api.example.com/tasks?source=inbox",
      invokeWithOptions: invokePostWithOptions,
      requestOptionsWithHeadersAndQuery: {
        headers: {
          Authorization: "Bearer token",
        },
        query: {
          source: "inbox",
        },
        body: {
          title: "Write tests",
        },
      },
    },
    {
      methodName: "put()",
      expectedUrlWithHeadersAndQuery:
        "https://api.example.com/tasks/task-1?view=details",
      invokeWithOptions: invokePutWithOptions,
      requestOptionsWithHeadersAndQuery: {
        headers: {
          Authorization: "Bearer token",
        },
        query: {
          view: "details",
        },
        body: {
          title: "Updated title",
        },
      },
    },
    {
      methodName: "delete()",
      expectedUrlWithHeadersAndQuery:
        "https://api.example.com/tasks/task-1?hardDelete=true",
      invokeWithOptions: invokeDeleteWithOptions,
      requestOptionsWithHeadersAndQuery: {
        headers: {
          Authorization: "Bearer token",
        },
        query: {
          hardDelete: "true",
        },
      },
    },
  ])(
    "$methodName lets the caller include headers and query params in the request",
    async ({
      expectedUrlWithHeadersAndQuery,
      invokeWithOptions,
      requestOptionsWithHeadersAndQuery,
    }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      const fetchSpy = mockFetch();

      // Act
      await invokeWithOptions(restApiClient, requestOptionsWithHeadersAndQuery);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        expectedUrlWithHeadersAndQuery,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer token",
          }),
        }),
      );
    },
  );

  it.each([
    {
      methodName: "get()",
      responseData: {
        id: "task-1",
      },
      invoke: getTasks,
    },
    {
      methodName: "post()",
      responseData: {
        created: true,
      },
      invoke: postTasks,
    },
    {
      methodName: "put()",
      responseData: {
        updated: true,
      },
      invoke: putTask,
    },
    {
      methodName: "delete()",
      responseData: {
        deleted: true,
      },
      invoke: deleteTask,
    },
  ])(
    "$methodName works when the caller does not provide request options",
    async ({ invoke, responseData }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      const fetchSpy = mockFetch(responseData);

      // Act
      const response = await invoke(restApiClient);

      // Assert
      expect(response).toEqual({
        data: responseData,
        headers: {
          "content-type": "application/json",
          "x-test": "yes",
        },
        status: 200,
        statusText: "OK",
      });
      expect(fetchSpy).toHaveBeenCalledOnce();
    },
  );

  it.each([
    {
      methodName: "get()",
      expectedUrl: "https://api.example.com/tasks",
      invokeWithOptions: invokeGetWithOptions,
    },
    {
      methodName: "post()",
      expectedUrl: "https://api.example.com/tasks",
      invokeWithOptions: invokePostWithOptions,
    },
    {
      methodName: "put()",
      expectedUrl: "https://api.example.com/tasks/task-1",
      invokeWithOptions: invokePutWithOptions,
    },
    {
      methodName: "delete()",
      expectedUrl: "https://api.example.com/tasks/task-1",
      invokeWithOptions: invokeDeleteWithOptions,
    },
  ])(
    "$methodName requests the endpoint using the configured base URL and query params",
    async ({ invokeWithOptions, expectedUrl }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      const fetchSpy = mockFetch();

      // Act
      await invokeWithOptions(restApiClient, {
        query: {
          status: "open",
          page: 2,
        },
      });

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        `${expectedUrl}?status=open&page=2`,
        expect.any(Object),
      );
    },
  );

  it.each([
    {
      methodName: "get()",
      expectedUrl: "https://api.example.com/tasks",
      invoke: getTasks,
    },
    {
      methodName: "post()",
      expectedUrl: "https://api.example.com/tasks",
      invoke: postTasks,
    },
    {
      methodName: "put()",
      expectedUrl: "https://api.example.com/tasks/task-1",
      invoke: putTask,
    },
    {
      methodName: "delete()",
      expectedUrl: "https://api.example.com/tasks/task-1",
      invoke: deleteTask,
    },
  ])(
    "$methodName requests the provided endpoint unchanged when there are no query params",
    async ({ expectedUrl, invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      const fetchSpy = mockFetch();

      // Act
      await invoke(restApiClient);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    },
  );

  it.each([
    {
      methodName: "get()",
      expectedUrl: "https://api.example.com/tasks",
      invokeWithOptions: invokeGetWithOptions,
    },
    {
      methodName: "post()",
      expectedUrl: "https://api.example.com/tasks",
      invokeWithOptions: invokePostWithOptions,
    },
    {
      methodName: "put()",
      expectedUrl: "https://api.example.com/tasks/task-1",
      invokeWithOptions: invokePutWithOptions,
    },
    {
      methodName: "delete()",
      expectedUrl: "https://api.example.com/tasks/task-1",
      invokeWithOptions: invokeDeleteWithOptions,
    },
  ])(
    "$methodName serializes all supported query param value variations into the request URL",
    async ({ expectedUrl, invokeWithOptions }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      const fetchSpy = mockFetch();

      // Act
      await invokeWithOptions(restApiClient, {
        query: {
          archived: false,
          page: 2,
          priorities: [1, 3],
          status: "open",
          labels: ["work", "deep"],
        },
      });

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        `${expectedUrl}?archived=false&page=2&priorities=1&priorities=3&status=open&labels=work&labels=deep`,
        expect.any(Object),
      );
    },
  );

  it.each(allMethodInvocations)(
    "$methodName includes all default headers in outgoing requests",
    async ({ invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      const fetchSpy = mockFetch();

      // Act
      await invoke(restApiClient);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    },
  );

  it.each([
    {
      methodName: "get()",
      invokeWithOptions: invokeGetWithOptions,
    },
    {
      methodName: "post()",
      invokeWithOptions: invokePostWithOptions,
    },
    {
      methodName: "put()",
      invokeWithOptions: invokePutWithOptions,
    },
    {
      methodName: "delete()",
      invokeWithOptions: invokeDeleteWithOptions,
    },
  ])(
    "$methodName prefers caller-provided headers over the default ones",
    async ({ invokeWithOptions }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      const fetchSpy = mockFetch();

      // Act
      await invokeWithOptions(restApiClient, {
        headers: {
          "Content-Type": "text/plain",
        },
      });

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            "Content-Type": "text/plain",
          },
        }),
      );
    },
  );

  it.each([
    {
      methodName: "get()",
      expectedMethod: "GET",
      invoke: getTasks,
    },
    {
      methodName: "post()",
      expectedMethod: "POST",
      invoke: postTasks,
    },
    {
      methodName: "put()",
      expectedMethod: "PUT",
      invoke: putTask,
    },
    {
      methodName: "delete()",
      expectedMethod: "DELETE",
      invoke: deleteTask,
    },
  ])(
    "$methodName sends the request with the method chosen by the caller",
    async ({ expectedMethod, invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      const fetchSpy = mockFetch();

      // Act
      await invoke(restApiClient);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: expectedMethod,
        }),
      );
    },
  );

  it.each(allMethodInvocations)(
    "$methodName includes credentials when the client is configured to do so",
    async ({ invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient({
        withCredentials: true,
      });
      const fetchSpy = mockFetch();

      // Act
      await invoke(restApiClient);

      // Assert
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: "include",
        }),
      );
    },
  );

  it.each(allMethodInvocations)(
    "$methodName omits credentials when the client is configured not to do so",
    async ({ invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient({
        withCredentials: false,
      });
      const fetchSpy = mockFetch();

      // Act
      await invoke(restApiClient);

      // Assert
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: "omit",
        }),
      );
    },
  );

  it.each([
    {
      methodName: "post()",
      invokeWithOptions: invokePostWithOptions,
    },
    {
      methodName: "put()",
      invokeWithOptions: invokePutWithOptions,
    },
  ])("$methodName sends the request body as JSON", async ({ invokeWithOptions }) => {
    // Arrange
    const restApiClient = createRestApiClient();
    const fetchSpy = mockFetch();
    const body = {
      title: "Write tests",
    };

    // Act
    await invokeWithOptions(restApiClient, {
      body,
    });

    // Assert
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify(body),
      }),
    );
  });

  it.each([
    {
      methodName: "post()",
      invoke: postTasks,
    },
    {
      methodName: "put()",
      invoke: putTask,
    },
  ])(
    "$methodName does not send a body when the caller did not provide one",
    async ({ invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      const fetchSpy = mockFetch();

      // Act
      await invoke(restApiClient);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: undefined,
        }),
      );
    },
  );

  it.each([
    {
      methodName: "get()",
      invokeWithInvalidBody: invokeGetWithInvalidBody,
    },
    {
      methodName: "delete()",
      invokeWithInvalidBody: invokeDeleteWithInvalidBody,
    },
  ])(
    "$methodName does not send a body when the method cannot have one",
    async ({ invokeWithInvalidBody }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      const fetchSpy = mockFetch();

      if (!invokeWithInvalidBody) {
        throw new Error("Expected method case to provide invokeWithInvalidBody.");
      }

      // Act
      await invokeWithInvalidBody(restApiClient);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: undefined,
        }),
      );
    },
  );

  it.each(allMethodInvocations)(
    "$methodName applies registered interceptors before the request is sent",
    async ({ invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      const fetchSpy = mockFetch();

      restApiClient.addRequestInterceptor(request => ({
        ...request,
        headers: {
          ...request.headers,
          Authorization: "Bearer token",
        },
      }));

      // Act
      await invoke(restApiClient);

      // Assert
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer token",
          }),
        }),
      );
    },
  );

  it.each(allMethodInvocations)(
    "$methodName returns the response after registered interceptors have processed it",
    async ({ invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      const fetchSpy = mockFetch({
        title: "Before interceptor",
      });

      restApiClient.addResponseInterceptor(response => ({
        ...response,
        data: {
          ...(response.data as Record<string, unknown>),
          title: "After interceptor",
        },
      }));

      // Act
      const response = await invoke(restApiClient);

      // Assert
      expect(response.data).toEqual({
        title: "After interceptor",
      });
      expect(fetchSpy).toHaveBeenCalledOnce();
    },
  );
});

describe("public error contract", () => {
  it.each(allMethodInvocations)(
    "$methodName throws HttpError with kind 'http' when the response status is not 2xx",
    async ({ invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      mockFetch(
        { message: "Unauthorized" },
        { status: 401, statusText: "Unauthorized" },
      );

      // Act
      const error = await getThrownError(() => invoke(restApiClient));

      // Assert
      expect(isHttpError(error)).toBe(true);

      if (!isHttpError(error)) {
        throw new Error("Expected HttpError.");
      }

      expect(error.kind).toBe("http");
    },
  );

  it.each(allMethodInvocations)(
    "$methodName includes request-interceptor header changes in HttpError.request for non-2xx responses",
    async ({ invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      const authorizationHeaderValue = "Bearer token";

      restApiClient.addRequestInterceptor(request => ({
        ...request,
        headers: {
          ...request.headers,
          Authorization: authorizationHeaderValue,
        },
      }));

      mockFetch(
        { message: "Unauthorized" },
        { status: 401, statusText: "Unauthorized" },
      );

      // Act
      const error = await getThrownError(() => invoke(restApiClient));

      // Assert
      expect(isHttpError(error)).toBe(true);

      if (!isHttpError(error)) {
        throw new Error("Expected HttpError.");
      }

      expect(error.request?.headers).toEqual(
        expect.objectContaining({
          Authorization: authorizationHeaderValue,
        }),
      );
    },
  );

  it.each(allMethodInvocations)(
    "$methodName runs response middleware before throwing HttpError for a non-2xx response",
    async ({ invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      const responseInterceptor = vi.fn(response => response);

      mockFetch(
        { message: "Unauthorized" },
        { status: 401, statusText: "Unauthorized" },
      );
      restApiClient.addResponseInterceptor(responseInterceptor);

      // Act
      await getThrownError(() => invoke(restApiClient));

      // Assert
      expect(responseInterceptor).toHaveBeenCalledOnce();
    },
  );

  it.each(allMethodInvocations)(
    "$methodName throws HttpError with kind 'request_interceptor' when request middleware throws",
    async ({ invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient();

      restApiClient.addRequestInterceptor(() => {
        throw new Error("Request middleware failed");
      });

      // Act
      const error = await getThrownError(() => invoke(restApiClient));

      // Assert
      expect(isHttpError(error)).toBe(true);

      if (!isHttpError(error)) {
        throw new Error("Expected HttpError.");
      }

      expect(error.kind).toBe("request_interceptor");
    },
  );

  it.each(allMethodInvocations)(
    "$methodName throws HttpError with kind 'network' when fetch throws",
    async ({ invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network failed"));

      // Act
      const error = await getThrownError(() => invoke(restApiClient));

      // Assert
      expect(isHttpError(error)).toBe(true);

      if (!isHttpError(error)) {
        throw new Error("Expected HttpError.");
      }

      expect(error.kind).toBe("network");
    },
  );

  it.each(allMethodInvocations)(
    "$methodName throws HttpError with kind 'response_parse' when response parsing fails",
    async ({ invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        createResponseWithRejectedJson(),
      );

      // Act
      const error = await getThrownError(() => invoke(restApiClient));

      // Assert
      expect(isHttpError(error)).toBe(true);

      if (!isHttpError(error)) {
        throw new Error("Expected HttpError.");
      }

      expect(error.kind).toBe("response_parse");
    },
  );

  it.each(allMethodInvocations)(
    "$methodName returns undefined data for 204 no content responses",
    async ({ invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(null, {
          status: 204,
          statusText: "No Content",
        }),
      );

      // Act
      const result = await invoke(restApiClient);

      // Assert
      expect(result.status).toBe(204);
      expect(result.data).toBeUndefined();
    },
  );

  it.each(allMethodInvocations)(
    "$methodName returns text data for non-json responses",
    async ({ invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      const responseBody = "Service unavailable";
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(responseBody, {
          status: 503,
          statusText: "Service Unavailable",
          headers: {
            "Content-Type": "text/plain",
          },
        }),
      );

      // Act
      const error = await getThrownError(() => invoke(restApiClient));

      // Assert
      expect(isHttpError(error)).toBe(true);

      if (!isHttpError(error)) {
        throw new Error("Expected HttpError.");
      }

      expect(error.kind).toBe("http");
      expect(error.response?.data).toBe(responseBody);
    },
  );

  it.each(allMethodInvocations)(
    "$methodName throws HttpError with kind 'response_interceptor' when response middleware throws",
    async ({ invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      mockFetch({ ok: true });

      restApiClient.addResponseInterceptor(() => {
        throw new Error("Response middleware failed");
      });

      // Act
      const error = await getThrownError(() => invoke(restApiClient));

      // Assert
      expect(isHttpError(error)).toBe(true);

      if (!isHttpError(error)) {
        throw new Error("Expected HttpError.");
      }

      expect(error.kind).toBe("response_interceptor");
    },
  );

  it.each(allMethodInvocations)(
    "$methodName throws HttpError with kind 'unknown' when an unexpected non-HttpError failure escapes normalization",
    async ({ invoke }) => {
      // Arrange
      const restApiClient = createRestApiClient();
      const mockedMiddlewareService = {
        pipe: vi.fn().mockRejectedValue("unexpected failure"),
      };

      (
        restApiClient as unknown as {
          middlewareService: typeof mockedMiddlewareService;
        }
      ).middlewareService = mockedMiddlewareService;

      // Act
      const error = await getThrownError(() => invoke(restApiClient));

      // Assert
      expect(isHttpError(error)).toBe(true);

      if (!isHttpError(error)) {
        throw new Error("Expected HttpError.");
      }

      expect(error.kind).toBe("unknown");
    },
  );
});

describe("middleware", () => {
  it("addRequestInterceptor() lets callers stop applying a registered request interceptor", async () => {
    // Arrange
    const restApiClient = createRestApiClient();
    const fetchSpy = mockFetch();
    const requestInterceptor = vi.fn(request => ({
      ...request,
      headers: {
        ...request.headers,
        Authorization: "Bearer token",
      },
    }));
    const stopIntercepting = restApiClient.addRequestInterceptor(requestInterceptor);

    // Act
    stopIntercepting();
    await restApiClient.get("/tasks");

    // Assert
    expect(requestInterceptor).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.com/tasks",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
  });

  it("removeRequestInterceptor() stops applying a previously registered request interceptor", async () => {
    // Arrange
    const restApiClient = createRestApiClient();
    const fetchSpy = mockFetch();
    const requestInterceptor = vi.fn(request => ({
      ...request,
      headers: {
        ...request.headers,
        Authorization: "Bearer token",
      },
    }));

    restApiClient.addRequestInterceptor(requestInterceptor);
    restApiClient.removeRequestInterceptor(requestInterceptor);

    // Act
    await restApiClient.get("/tasks");

    // Assert
    expect(requestInterceptor).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.com/tasks",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
  });

  it("addResponseInterceptor() lets callers stop applying a registered response interceptor", async () => {
    // Arrange
    const restApiClient = createRestApiClient();
    const responseInterceptor = vi.fn(response => ({
      ...response,
      data: {
        title: "After interceptor",
      },
    }));
    const stopIntercepting =
      restApiClient.addResponseInterceptor(responseInterceptor);
    mockFetch({
      title: "Before interceptor",
    });

    // Act
    stopIntercepting();
    const response = await restApiClient.get<{
      title: string;
    }>("/tasks");

    // Assert
    expect(responseInterceptor).not.toHaveBeenCalled();
    expect(response.data).toEqual({
      title: "Before interceptor",
    });
  });

  it("removeResponseInterceptor() stops applying a previously registered response interceptor", async () => {
    // Arrange
    const restApiClient = createRestApiClient();
    const responseInterceptor = vi.fn(response => ({
      ...response,
      data: {
        title: "After interceptor",
      },
    }));

    restApiClient.addResponseInterceptor(responseInterceptor);
    restApiClient.removeResponseInterceptor(responseInterceptor);
    mockFetch({
      title: "Before interceptor",
    });

    // Act
    const response = await restApiClient.get<{
      title: string;
    }>("/tasks");

    // Assert
    expect(responseInterceptor).not.toHaveBeenCalled();
    expect(response.data).toEqual({
      title: "Before interceptor",
    });
  });

  it("applies only the interceptors that remain registered as request and response middleware change over time", async () => {
    // Arrange
    const restApiClient = createRestApiClient();
    const fetchSpy = mockFetch({
      title: "Before response middleware",
    });
    const firstRequestInterceptor = vi.fn(request => ({
      ...request,
      headers: {
        ...request.headers,
        "X-First": "first",
      },
    }));
    const secondRequestInterceptor = vi.fn(request => ({
      ...request,
      headers: {
        ...request.headers,
        "X-Second": "second",
      },
    }));
    const firstResponseInterceptor = vi.fn(response => ({
      ...response,
      data: {
        ...(response.data as Record<string, unknown>),
        first: true,
      },
    }));
    const secondResponseInterceptor = vi.fn(response => ({
      ...response,
      data: {
        ...(response.data as Record<string, unknown>),
        second: true,
      },
    }));

    const stopFirstRequestInterceptor = restApiClient.addRequestInterceptor(
      firstRequestInterceptor,
    );
    restApiClient.addRequestInterceptor(secondRequestInterceptor);
    const stopFirstResponseInterceptor = restApiClient.addResponseInterceptor(
      firstResponseInterceptor,
    );
    restApiClient.addResponseInterceptor(secondResponseInterceptor);

    // Act
    const firstResponse = await restApiClient.get<{
      title: string;
      first?: boolean;
      second?: boolean;
    }>("/tasks");

    stopFirstRequestInterceptor();
    stopFirstResponseInterceptor();

    const secondResponse = await restApiClient.get<{
      title: string;
      first?: boolean;
      second?: boolean;
    }>("/tasks");

    // Assert
    expect(firstRequestInterceptor).toHaveBeenCalledOnce();
    expect(secondRequestInterceptor).toHaveBeenCalledTimes(2);
    expect(firstResponseInterceptor).toHaveBeenCalledOnce();
    expect(secondResponseInterceptor).toHaveBeenCalledTimes(2);

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      "https://api.example.com/tasks",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          "X-First": "first",
          "X-Second": "second",
        },
      }),
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      "https://api.example.com/tasks",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          "X-Second": "second",
        },
      }),
    );

    expect(firstResponse.data).toEqual({
      title: "Before response middleware",
      first: true,
      second: true,
    });
    expect(secondResponse.data).toEqual({
      title: "Before response middleware",
      second: true,
    });
  });
});

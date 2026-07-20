# API Clients

Typed REST and GraphQL clients for TypeScript, sharing one interceptor pipeline and one way of reporting errors.
I built them because every app I worked on ended up with API calls that each handled auth and errors in their own way.

## The problem

API calls start simple.
You call an endpoint, read the data, and move on.

Then the app grows.
Every call needs the same headers and the same session handling, so that logic gets copied into each request or into a helper that slowly turns into a mess.

Then things start failing.
A 404 or a 500 comes back looking like a normal response, and the UI renders an error body as if it were data.

A dropped connection, a broken JSON body and a GraphQL error each fail in a different shape.
Every `catch` block ends up guessing what it got, and the logs only say that something failed.

On top of that, the REST and GraphQL code share nothing.
Auth, logging and error handling get written twice and drift apart.

## What this does instead

Both clients send every request through the same pipeline.
Interceptors handle the cross-cutting work, and every failure becomes one tagged error you can narrow with a type guard.

A few things are handled for you:

- Every 4xx and 5xx response rejects, so a failed call is never mistaken for data.
- An `http` error carries the status, the parsed error body and the exact request that was sent.
- Every failure has a `kind`, like `network`, `http` or `response_parse`, with a guard for each.
- Bodies are parsed by content type, and 204 or empty responses come back as `undefined`.
- Every `add` returns a function that removes exactly that interceptor.
- Responses are generic and fully typed, with no `any`.

## Why the core has no React in it

The clients don't know React exists.
This repo is a Vite and React app only because that's how I scaffolded it.

I did that on purpose.
Talking to an API is plain TypeScript, so it shouldn't be locked to one framework, and it's much easier to test without rendering components.

The same clients work in Vue, Svelte, Angular or plain TypeScript.

## Examples

The clients live under `src/api`, and the examples import them through the `@/` alias, which points at `src`.

### Getting started

```ts
import { RestApiClient } from "@/api/rest/services/RestApiClient";

const api = new RestApiClient({
  baseURL: "https://api.example.com",
  withCredentials: true,
});

const { data: posts } = await api.get<Post[]>("/posts", {
  query: { limit: 10, tags: ["ts", "react"] },
});

const { data: created } = await api.post<Post>("/posts", {
  body: { title: "Hello", draft: true },
});
```

`withCredentials: true` sends the session cookie with every request.
The session lives in an HttpOnly cookie, so no token is ever readable from JavaScript or kept in storage.

Array values in `query` become repeated params, so this sends `?limit=10&tags=ts&tags=react`.
The response also gives you `status`, `statusText` and `headers` next to `data`.

### Interceptors

```ts
import { HttpStatusCode } from "@/api/rest/models/http.models";

const getCsrfToken = () =>
  document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? "";

api.addRequestInterceptor((request) =>
  request.method === "GET"
    ? request
    : { ...request, headers: { ...request.headers, "X-CSRF-Token": getCsrfToken() } },
);

const removeSessionCheck = api.addResponseInterceptor((response) => {
  if (response.status === HttpStatusCode.Unauthorized) {
    redirectToLogin();
  }

  return response;
});

// Remove the interceptor once you no longer need it.
removeSessionCheck();
```

Cookie sessions need CSRF protection, so every request that changes data gets the token the server rendered into the page.
An expired session is caught in one place, instead of in every `catch` block.

Interceptors run in the order you add them, and each async one is awaited before the next starts.
If one throws, the request stops and you get a `request_interceptor` or `response_interceptor` error.

### GraphQL

```ts
import { GraphQLClient } from "graphql-request";
import { GraphQLApiClient } from "@/api/graphql/services/GraphQLApiClient";
import { gql } from "@/api/graphql/utils/gql";
import { isGraphQLNetworkError } from "@/api/graphql/errors/GraphQLError.guards";

const PROJECT_QUERY = gql`
  query Project($id: ID!) {
    project(id: $id) {
      name
      owner {
        name
      }
    }
  }
`;

interface ProjectQuery {
  project: { name: string; owner: { name: string } } | null;
}

const gqlApi = new GraphQLApiClient(
  new GraphQLClient("https://api.example.com/graphql", {
    credentials: "include",
  }),
);

gqlApi.addRequestInterceptor((context) => ({
  ...context,
  requestHeaders: { "X-CSRF-Token": getCsrfToken() },
}));

try {
  const { project } = await gqlApi.query<ProjectQuery, { id: string }>(PROJECT_QUERY, { id: "42" });
} catch (error) {
  if (isGraphQLNetworkError(error)) {
    showOfflineBanner();
  }
}
```

Interceptors work exactly like the REST ones, so the CSRF header is added the same way on both.
Errors returned by the server come back as `operation`, with the original error on `error.cause`.

### Error kinds

| Kind                   | When it happens                                     |
| ---------------------- | --------------------------------------------------- |
| `network`              | The request never got a response.                   |
| `http`                 | The server answered with a status outside 2xx.      |
| `response_parse`       | The body claimed to be JSON but couldn't be parsed. |
| `operation`            | A GraphQL call returned errors or was aborted.      |
| `request_interceptor`  | A request interceptor threw.                        |
| `response_interceptor` | A response interceptor threw.                       |
| `unknown`              | The failure didn't fit any of the kinds above.      |

`http` and `response_parse` only exist on the REST client, and `operation` only exists on the GraphQL one.

## What happens on a request

1. Request interceptors run in order, and each one gets the previous one's output.
2. The request is sent, and a `network` error is thrown if no response comes back.
3. The body is parsed by content type, and empty bodies become `undefined`.
4. Response interceptors run on the parsed response.
5. Any status outside 2xx is thrown as an `http` error.

If an interceptor throws an error that is already tagged, it passes through untouched.
That lets your own interceptors throw a specific `HttpError` without it being wrapped again.

## Ideas for the future

- Timeouts and cancellation, so every request can take an `AbortSignal` or a time limit and fail with its own `timeout` kind.
- Retries with exponential backoff for temporary failures, without ever repeating a request that isn't safe to send twice.
- First-class support for response validation with [Standard Schema](https://standardschema.dev), so a Zod, Valibot or ArkType schema can check the data and fail with a `validation` kind.

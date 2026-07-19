// Keep those as functions because in tests sometimes stubbing an env is neessary and we always need the latest env variables.
export const isDevEnvironment = (): boolean => import.meta.env.DEV;

export const getEnvironmentMode = () =>
  import.meta.env.MODE as "development" | "production" | "test";

export const isTestEnvironment = (): boolean => getEnvironmentMode() === "test";

export const getApiBaseURL = (): string => import.meta.env.VITE_API_URL_BASE;

export const getGraphQlApiURL = (): string => import.meta.env.VITE_GRAPHQL_API_URL;

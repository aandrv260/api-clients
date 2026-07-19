import { GraphQLError } from "./GraphQLError";

export const isGraphQLError = (error: unknown): error is GraphQLError => {
  return error instanceof GraphQLError && error.isGraphQLError === true;
};

export const isGraphQLNetworkError = (error: unknown): error is GraphQLError => {
  return isGraphQLError(error) && error.kind === "network";
};

export const isGraphQLUnknownError = (error: unknown): error is GraphQLError => {
  return isGraphQLError(error) && error.kind === "unknown";
};

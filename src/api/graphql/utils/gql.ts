import { gql as graphqlRequestGql } from "graphql-request";

type QueryTemplateFn = (
  chunks: TemplateStringsArray,
  ...variables: unknown[]
) => string;

export const gql: QueryTemplateFn = graphqlRequestGql;

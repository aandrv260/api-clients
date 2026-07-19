import type { GraphQLOperationContext } from "../models/GraphQLOperationContext";
import type { HttpInterceptor } from "../../interceptors/InterceptorRegistry";

export type GraphQLRequestInterceptor = HttpInterceptor<GraphQLOperationContext>;

export type GraphQLResponseInterceptor = HttpInterceptor<unknown>;

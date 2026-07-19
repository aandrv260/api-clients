/** One step in a chain: synchronous or async transform of the same value type. */
export type HttpInterceptor<TValue = unknown> = (
  value: TValue,
) => TValue | Promise<TValue>;

export type InterceptorChainErrorHandler<TValue> = (
  error: unknown,
  valueAtFailure: TValue,
) => never;

export class InterceptorRegistry<TValue> {
  private readonly interceptors = new Set<HttpInterceptor<TValue>>();

  public add(interceptor: HttpInterceptor<TValue>): () => boolean {
    this.interceptors.add(interceptor);
    return () => this.remove(interceptor);
  }

  public remove(interceptor: HttpInterceptor<TValue>): boolean {
    return this.interceptors.delete(interceptor);
  }

  public has(interceptor: HttpInterceptor<TValue>): boolean {
    return this.interceptors.has(interceptor);
  }

  public async run(
    initial: TValue,
    onInterceptorError: InterceptorChainErrorHandler<TValue>,
  ): Promise<TValue> {
    let current: TValue = initial;

    for (const interceptor of this.interceptors) {
      try {
        current = await interceptor(current);
      } catch (error) {
        onInterceptorError(error, current);
      }
    }

    return current;
  }
}

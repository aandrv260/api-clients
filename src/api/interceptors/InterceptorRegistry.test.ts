import { describe, it, expect, vi } from "vitest";
import { InterceptorRegistry } from "./InterceptorRegistry";

describe("InterceptorRegistry", () => {
  it("runs interceptors in registration order", async () => {
    // Arrange
    const registry = new InterceptorRegistry<number>();
    const order: number[] = [];

    registry.add(async value => {
      order.push(1);
      return value + 10;
    });

    registry.add(async value => {
      order.push(2);
      return value * 2;
    });

    // Act
    const result = await registry.run(3, () => {
      throw new Error("unexpected");
    });

    // Assert
    expect(order).toEqual([1, 2]);
    expect(result).toBe(26);
  });

  it("add() returns unsubscribe function that removes the interceptor", async () => {
    // Arrange
    const registry = new InterceptorRegistry<number>();
    const spy = vi.fn((value: number) => value + 1);
    const unsubscribe = registry.add(spy);

    // Act
    expect(unsubscribe()).toBe(true);

    const result = await registry.run(0, () => {
      throw new Error("unexpected");
    });

    // Assert
    expect(spy).not.toHaveBeenCalled();
    expect(result).toBe(0);
  });

  it("unsubscribe returns false when interceptor was already removed", () => {
    // Arrange
    const registry = new InterceptorRegistry<number>();
    const interceptor = (value: number) => value;
    const unsubscribe = registry.add(interceptor);

    unsubscribe();

    // Act
    const second = unsubscribe();

    // Assert
    expect(second).toBe(false);
  });

  it("remove returns false when interceptor is not registered", () => {
    // Arrange
    const registry = new InterceptorRegistry<number>();
    const interceptor = (value: number) => value;

    // Act
    const removed = registry.remove(interceptor);

    // Assert
    expect(removed).toBe(false);
  });

  it("invokes onInterceptorError with error and value passed into failing interceptor", async () => {
    // Arrange
    const registry = new InterceptorRegistry<number>();
    const failure = new Error("interceptor failed");

    registry.add(value => value + 1);

    registry.add(() => {
      throw failure;
    });

    const onError = vi.fn((error: unknown, valueAtFailure: number) => {
      expect(valueAtFailure).toBe(1);

      throw error;
    });

    // Act
    await expect(registry.run(0, onError)).rejects.toThrow("interceptor failed");

    // Assert
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(failure, 1);
  });

  it("has returns whether interceptor is registered", () => {
    // Arrange
    const registry = new InterceptorRegistry<number>();
    const interceptor = (value: number) => value;

    // Assert
    expect(registry.has(interceptor)).toBe(false);

    // Act
    registry.add(interceptor);

    // Assert
    expect(registry.has(interceptor)).toBe(true);
  });
});

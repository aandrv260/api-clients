import { describe, expect, it } from "vitest";
import { getFinalURL } from "./RestApiClient.utils";

describe("getFinalURL()", () => {
  it("returns the base URL with the endpoint when no query params are provided", () => {
    // Arrange
    const baseURL = "https://api.example.com";
    const endpoint = "/tasks";

    // Act
    const finalURL = getFinalURL(baseURL, endpoint);

    // Assert
    expect(finalURL).toBe("https://api.example.com/tasks");
  });

  it("serializes string query params into the URL", () => {
    // Arrange
    const baseURL = "https://api.example.com";
    const endpoint = "/tasks";

    // Act
    const finalURL = getFinalURL(baseURL, endpoint, {
      status: "open",
    });

    // Assert
    expect(finalURL).toBe("https://api.example.com/tasks?status=open");
  });

  it("serializes number query params into the URL", () => {
    // Arrange
    const baseURL = "https://api.example.com";
    const endpoint = "/tasks";

    // Act
    const finalURL = getFinalURL(baseURL, endpoint, {
      page: 2,
    });

    // Assert
    expect(finalURL).toBe("https://api.example.com/tasks?page=2");
  });

  it("serializes boolean query params into the URL", () => {
    // Arrange
    const baseURL = "https://api.example.com";
    const endpoint = "/tasks";

    // Act
    const finalURL = getFinalURL(baseURL, endpoint, {
      archived: false,
    });

    // Assert
    expect(finalURL).toBe("https://api.example.com/tasks?archived=false");
  });

  it("serializes string array query params as repeated values", () => {
    // Arrange
    const baseURL = "https://api.example.com";
    const endpoint = "/tasks";

    // Act
    const finalURL = getFinalURL(baseURL, endpoint, {
      labels: ["work", "deep"],
    });

    // Assert
    expect(finalURL).toBe("https://api.example.com/tasks?labels=work&labels=deep");
  });

  it("serializes number array query params as repeated values", () => {
    // Arrange
    const baseURL = "https://api.example.com";
    const endpoint = "/tasks";

    // Act
    const finalURL = getFinalURL(baseURL, endpoint, {
      priorities: [1, 3],
    });

    // Assert
    expect(finalURL).toBe("https://api.example.com/tasks?priorities=1&priorities=3");
  });

  it("serializes all supported query param value variations into the same URL", () => {
    // Arrange
    const baseURL = "https://api.example.com";
    const endpoint = "/tasks";

    // Act
    const finalURL = getFinalURL(baseURL, endpoint, {
      archived: false,
      page: 2,
      priorities: [1, 3],
      status: "open",
      labels: ["work", "deep"],
    });

    // Assert
    expect(finalURL).toBe(
      "https://api.example.com/tasks?archived=false&page=2&priorities=1&priorities=3&status=open&labels=work&labels=deep",
    );
  });
});

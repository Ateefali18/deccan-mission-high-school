import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "../app/ThemeContext";
import { ThemeSelector } from "../components/ui/ThemeSelector";

// Mock matchMedia & localStorage
beforeEach(() => {
  if (typeof window.localStorage === "undefined") {
    let store: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
    Object.defineProperty(window, "localStorage", { value: mockStorage, writable: true });
    Object.defineProperty(globalThis, "localStorage", { value: mockStorage, writable: true });
  }

  window.matchMedia =
    window.matchMedia ||
    function () {
      return {
        matches: false,
        addListener: function () {},
        removeListener: function () {},
        addEventListener: function () {},
        removeEventListener: function () {},
        dispatchEvent: function () {},
      };
    };
});

describe("ThemeSelector & ThemeContext", () => {
  it("renders light, dark, and system theme mode buttons", () => {
    render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>
    );

    expect(screen.getByText("Light")).toBeDefined();
    expect(screen.getByText("Dark")).toBeDefined();
    expect(screen.getByText("System")).toBeDefined();
  });

  it("applies dark mode class to root document upon selecting dark mode", () => {
    render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>
    );

    const darkBtn = screen.getByTitle("Switch to Dark mode");
    fireEvent.click(darkBtn);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("dmhs_theme")).toBe("dark");
  });
});

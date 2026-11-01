import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// jsdom has no ResizeObserver; Headless UI's Menu reads element size on open
// (@headlessui/react's element-movement util), throwing without this stub.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

afterEach(() => {
  localStorage.clear();
});

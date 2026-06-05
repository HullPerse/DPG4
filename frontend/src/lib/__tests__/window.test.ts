import { describe, it, expect, beforeEach } from "vitest";
import type { WindowProps } from "@/types/window";

const {
  createWindow,
  closeWindow,
  minimizeWindow,
  unminimizeWindow,
  activeWindow,
  deactivateWindow,
  pinWindow,
  refreshWindow,
  moveWindow,
  setWindowMetaList,
  getWindowMeta,
  FALLBACK_WINDOWS,
} = await import("@/lib/window.utils");

function makeWindow(overrides: Partial<WindowProps> = {}): WindowProps {
  return {
    id: "test",
    title: "Test Window",
    children: "content",
    size: { width: 600, height: 400 },
    position: { x: 100, y: 100 },
    initialPosition: { x: 100, y: 100 },
    ...overrides,
  };
}

describe("createWindow", () => {
  it("adds a new window when none exists", () => {
    const prev: WindowProps[] = [];
    const w = makeWindow({ id: "new" });
    const result = createWindow(prev, w, "hello");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("new");
    expect(result[0].isActive).toBe(true);
    expect(result[0].children).toBe("hello");
    expect(result[0].createdAt).toBeInstanceOf(Date);
    expect(result[0].refreshKey).toBe(0);
  });

  it("re-activates an existing minimized window", () => {
    const prev = [
      makeWindow({ id: "same", isActive: false, isMinimized: true }),
    ];
    const w = makeWindow({ id: "same" });
    const result = createWindow(prev, w, "updated");

    expect(result).toHaveLength(1);
    expect(result[0].isActive).toBe(true);
    expect(result[0].isMinimized).toBe(false);
  });

  it("re-activates an existing non-minimized window", () => {
    const prev = [makeWindow({ id: "same", isActive: false })];
    const w = makeWindow({ id: "same" });
    const result = createWindow(prev, w, "updated");

    expect(result).toHaveLength(1);
    expect(result[0].isActive).toBe(true);
  });
});

describe("closeWindow", () => {
  it("removes the window by id", () => {
    const prev = [makeWindow({ id: "a" }), makeWindow({ id: "b" })];
    const result = closeWindow(prev, "a");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b");
  });

  it("returns same array if not found", () => {
    const prev = [makeWindow({ id: "a" })];
    const result = closeWindow(prev, "missing");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });
});

describe("minimizeWindow", () => {
  it("minimizes the target window", () => {
    const prev = [makeWindow({ id: "a", isActive: true })];
    const result = minimizeWindow(prev, "a");

    expect(result[0].isMinimized).toBe(true);
    expect(result[0].isActive).toBe(false);
  });

  it("returns same array if id not found", () => {
    const prev = [makeWindow({ id: "a" })];
    const result = minimizeWindow(prev, "missing");

    expect(result).toBe(prev);
  });
});

describe("unminimizeWindow", () => {
  it("unminimizes and activates the target", () => {
    const prev = [makeWindow({ id: "a", isMinimized: true, isActive: false })];
    const result = unminimizeWindow(prev, "a");

    expect(result[0].isMinimized).toBe(false);
    expect(result[0].isActive).toBe(true);
  });

  it("returns same array if id not found", () => {
    const prev = [makeWindow({ id: "a" })];
    const result = unminimizeWindow(prev, "missing");

    expect(result).toBe(prev);
  });
});

describe("activeWindow", () => {
  it("activates target and deactivates others", () => {
    const prev = [
      makeWindow({ id: "a", isActive: false }),
      makeWindow({ id: "b", isActive: true }),
    ];
    const result = activeWindow(prev, "a");

    const a = result.find((w) => w.id === "a")!;
    const b = result.find((w) => w.id === "b")!;
    expect(a.isActive).toBe(true);
    expect(b.isActive).toBe(false);
  });

  it("returns same array if id not found", () => {
    const prev = [makeWindow({ id: "a" })];
    const result = activeWindow(prev, "missing");

    expect(result).toBe(prev);
  });
});

describe("deactivateWindow", () => {
  it("deactivates target without affecting others", () => {
    const prev = [
      makeWindow({ id: "a", isActive: true }),
      makeWindow({ id: "b", isActive: true }),
    ];
    const result = deactivateWindow(prev, "a");

    expect(result.find((w) => w.id === "a")!.isActive).toBe(false);
    expect(result.find((w) => w.id === "b")!.isActive).toBe(true);
  });

  it("returns same array if id not found", () => {
    const prev = [makeWindow({ id: "a" })];
    const result = deactivateWindow(prev, "missing");

    expect(result).toBe(prev);
  });
});

describe("pinWindow", () => {
  it("toggles isPinned to true", () => {
    const prev = [makeWindow({ id: "a" })];
    const result = pinWindow(prev, "a");

    expect(result[0].isPinned).toBe(true);
  });

  it("toggles isPinned back to false", () => {
    const prev = [makeWindow({ id: "a", isPinned: true })];
    const result = pinWindow(prev, "a");

    expect(result[0].isPinned).toBe(false);
  });

  it("returns same array if id not found", () => {
    const prev = [makeWindow({ id: "a" })];
    const result = pinWindow(prev, "missing");

    expect(result).toBe(prev);
  });
});

describe("refreshWindow", () => {
  it("increments refreshKey and activates", () => {
    const prev = [makeWindow({ id: "a", isActive: false })];
    const result = refreshWindow(prev, "a");

    expect(result[0].refreshKey).toBe(1);
    expect(result[0].isActive).toBe(true);
  });
});

describe("moveWindow", () => {
  // jsdom default window size is 1024×768
  it("moves window to top-half", () => {
    const prev = [makeWindow({ id: "a" })];
    const result = moveWindow(prev, "a", "up");

    expect(result[0].position).toEqual({ x: 0, y: 0 });
    expect(result[0].size).toEqual({ width: 1024, height: 384 });
  });

  it("moves window to bottom-half", () => {
    const prev = [makeWindow({ id: "a" })];
    const result = moveWindow(prev, "a", "down");

    expect(result[0].position).toEqual({ x: 0, y: 384 });
    expect(result[0].size).toEqual({ width: 1024, height: 384 });
  });

  it("moves window to left-half", () => {
    const prev = [makeWindow({ id: "a" })];
    const result = moveWindow(prev, "a", "left");

    expect(result[0].position).toEqual({ x: 0, y: 0 });
    expect(result[0].size).toEqual({ width: 512, height: 768 });
  });

  it("moves window to right-half", () => {
    const prev = [makeWindow({ id: "a" })];
    const result = moveWindow(prev, "a", "right");

    expect(result[0].position).toEqual({ x: 512, y: 0 });
    expect(result[0].size).toEqual({ width: 512, height: 768 });
  });

  it("returns same array for unknown direction", () => {
    const prev = [makeWindow({ id: "a" })];
    const result = moveWindow(prev, "a", "diagonal" as string);

    expect(result).toBe(prev);
  });

  it("returns same array if id not found", () => {
    const prev = [makeWindow({ id: "a" })];
    const result = moveWindow(prev, "missing", "up");

    expect(result).toBe(prev);
  });
});

describe("setWindowMetaList / getWindowMeta", () => {
  beforeEach(() => {
    setWindowMetaList([]);
  });

  it("stores and retrieves window metadata", () => {
    const list = [
      { id: "wallet", title: "Кошелёк", size: { width: 480, height: 320 } },
      { id: "settings", title: "Настройки", overflow: true },
    ];
    setWindowMetaList(list);

    expect(getWindowMeta("wallet").title).toBe("Кошелёк");
    expect(getWindowMeta("wallet").size).toEqual({ width: 480, height: 320 });

    expect(getWindowMeta("settings").title).toBe("Настройки");
    expect(getWindowMeta("settings").overflow).toBe(true);
  });

  it("returns empty object for unknown id", () => {
    expect(getWindowMeta("nonexistent")).toEqual({});
  });

  it("overwrites previous entries on second call", () => {
    setWindowMetaList([{ id: "a", title: "first" }]);
    setWindowMetaList([{ id: "b", title: "second" }]);

    expect(getWindowMeta("a")).toEqual({});
    expect(getWindowMeta("b").title).toBe("second");
  });
});

describe("FALLBACK_WINDOWS", () => {
  it("has auth entry", () => {
    expect(FALLBACK_WINDOWS.auth.id).toBe("auth");
    expect(FALLBACK_WINDOWS.auth.title).toBe("Авторизация");
    expect(FALLBACK_WINDOWS.auth.disabled).toEqual({
      minimize: true,
      close: true,
    });
  });

  it("has signout entry", () => {
    expect(FALLBACK_WINDOWS.signout.id).toBe("signout");
    expect(FALLBACK_WINDOWS.signout.title).toBe("Выход");
  });
});

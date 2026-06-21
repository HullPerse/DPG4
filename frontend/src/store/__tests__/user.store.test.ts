import { describe, it, expect } from "vitest";
import { useUserStore } from "../user.store";

describe("UserStore", () => {
  it("starts with unauthenticated state", () => {
    const state = useUserStore.getState();
    expect(state.isAuth).toBe(false);
    expect(state.isAdmin).toBe(false);
    expect(state.loggedIn).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });
});

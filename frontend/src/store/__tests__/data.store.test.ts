import { describe, it, expect, beforeEach } from "vitest";
import { useDataStore } from "../data.store";

beforeEach(() => {
  useDataStore.setState({
    gamblingBanned: false,
    wallpaper: "",
    storeItems: [],
    rerollPrice: 2,
  });
});

describe("DataStore", () => {
  it("starts with gamblingBanned false", () => {
    expect(useDataStore.getState().gamblingBanned).toBe(false);
  });

  it("setGamblingBanned sets the flag", () => {
    useDataStore.getState().setGamblingBanned(true);
    expect(useDataStore.getState().gamblingBanned).toBe(true);
  });

  it("setGamblingBanned toggles back to false", () => {
    useDataStore.getState().setGamblingBanned(true);
    useDataStore.getState().setGamblingBanned(false);
    expect(useDataStore.getState().gamblingBanned).toBe(false);
  });

  it("resetSessionCaches clears gamblingBanned", () => {
    useDataStore.getState().setGamblingBanned(true);
    useDataStore.getState().resetSessionCaches();
    expect(useDataStore.getState().gamblingBanned).toBe(false);
  });

  it("clear resets all state including gamblingBanned", () => {
    useDataStore.getState().setGamblingBanned(true);
    useDataStore.getState().setRerollPrice(10);
    useDataStore.getState().clear();
    expect(useDataStore.getState().gamblingBanned).toBe(false);
    expect(useDataStore.getState().rerollPrice).toBe(2);
  });

  it("setStoreItems updates the store items", () => {
    const items = [
      { item: { id: "1", label: "test" }, price: 5, bought: false },
    ];
    useDataStore.getState().setStoreItems(items as never[]);
    expect(useDataStore.getState().storeItems).toEqual(items);
  });

  it("setWallpaper updates wallpaper", () => {
    useDataStore.getState().setWallpaper("test-wallpaper");
    expect(useDataStore.getState().wallpaper).toBe("test-wallpaper");
  });

  it("startMoving sets movingUser", () => {
    useDataStore.getState().startMoving("user1", 0, 5, 5, [0, 1, 2, 3, 4, 5]);
    const mu = useDataStore.getState().movingUser;
    expect(mu).not.toBeNull();
    expect(mu?.userId).toBe("user1");
    expect(mu?.currentStep).toBe(0);
    expect(mu?.isAnimating).toBe(true);
  });

  it("nextStep advances the step", () => {
    useDataStore.getState().startMoving("user1", 0, 5, 5, [0, 1, 2, 3, 4, 5]);
    useDataStore.getState().nextStep();
    expect(useDataStore.getState().movingUser?.currentStep).toBe(1);
  });

  it("finishMoving clears movingUser", () => {
    useDataStore.getState().startMoving("user1", 0, 5, 5, [0, 1, 2, 3, 4, 5]);
    useDataStore.getState().finishMoving();
    expect(useDataStore.getState().movingUser).toBeNull();
  });
});

import { Inventory, Item, Market, Trade } from "@/types/items";
import { apiFetch } from "./client.api";
import { filePayload } from "@/lib/fileBlob";

export default class ItemsApi {
  getAllItems = async (): Promise<Item[]> => {
    return await apiFetch<Item[]>("/items");
  };

  getAllInventories = async (): Promise<Inventory[]> => {
    return await apiFetch<Inventory[]>("/inventory");
  };

  addItem = async (data: Item): Promise<Item> => {
    const image =
      data.image instanceof File ? await filePayload(data.image) : data.image;
    return apiFetch<Item>("/items", {
      method: "POST",
      body: { ...data, image },
    });
  };

  getItemById = async (itemId: string): Promise<Item | undefined> => {
    return apiFetch<Item>(`/items/${itemId}`);
  };

  getInventory = async (userId: string): Promise<Inventory[]> => {
    return apiFetch<Inventory[]>(`/inventory?owner=${userId}`);
  };

  getInventoryById = async (inventoryId: string): Promise<Inventory> => {
    return apiFetch<Inventory>(`/inventory/${inventoryId}`);
  };

  addInventory = async (userId: string, itemId: string) => {
    return apiFetch("/inventory/add", {
      method: "POST",
      body: { userId, itemId },
    });
  };

  removeInventory = async (id: string) => {
    return apiFetch(`/inventory/${id}`, { method: "DELETE" });
  };

  sendInventory = async (inventoryId: string, newOwner: string) => {
    return apiFetch(`/inventory/${inventoryId}/transfer`, {
      method: "POST",
      body: { newOwner },
    });
  };

  chargeInventory = async (
    inventoryId: string,
    oldCharge: number,
    newCharge: number,
  ) => {
    return apiFetch(`/inventory/${inventoryId}/charge`, {
      method: "POST",
      body: { oldCharge, newCharge },
    });
  };

  useInventory = async (
    inventoryId: string,
  ): Promise<
    | { ok: true; mode: "done" }
    | { ok: true; mode: "modal"; label: string }
    | { ok: false; error: string }
  > => {
    return apiFetch(`/inventory/${inventoryId}/use`, { method: "POST" });
  };

  sellInventory = async (inventoryId: string, owner: string, price: number) => {
    return apiFetch("/market/sell", {
      method: "POST",
      body: { inventoryId, ownerId: owner, price },
    });
  };

  tradeInventory = async (currentUser: Trade, otherUser: Trade) => {
    return apiFetch("/trade", {
      method: "POST",
      body: { currentUser, otherUser },
    });
  };

  getMarket = async (): Promise<Market[]> => {
    return await apiFetch<Market[]>("/market");
  };

  getMarketById = async (marketId: string): Promise<Market> => {
    return await apiFetch<Market>(`/market/${marketId}`);
  };

  removeMarket = async (marketId: string) => {
    return apiFetch(`/market/${marketId}/remove`, { method: "POST" });
  };

  buyMarket = async (marketId: string, newOwner: string, oldOwner: string) => {
    return apiFetch(`/market/${marketId}/buy`, {
      method: "POST",
      body: { newOwnerId: newOwner, oldOwnerId: oldOwner },
    });
  };

  discountMarket = async (
    marketId: string,
    owner: string,
    price: number,
    discountPrice: number,
  ) => {
    return apiFetch(`/market/${marketId}/discount`, {
      method: "POST",
      body: { ownerId: owner, price, discountPrice },
    });
  };
}

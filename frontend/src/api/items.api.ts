import { Inventory, Item, Market, Trade } from "@/types/items";
import { apiFetch } from "./client.api";
import { filePayload } from "@/lib/fileBlob";

export default class ItemsApi {
  getAllItems = async (): Promise<Item[]> => {
    return await apiFetch<Item[]>("/items");
  };

  getItems = async (params?: {
    search?: string;
    type?: string;
    rollable?: boolean;
    excludeLabel?: string;
    sort?: "label" | "created" | "charge" | "type";
    order?: "asc" | "desc";
    labels?: string[];
    random?: number;
  }): Promise<Item[]> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.type) searchParams.set("type", params.type);
    if (params?.rollable !== undefined) searchParams.set("rollable", String(params.rollable));
    if (params?.excludeLabel) searchParams.set("excludeLabel", params.excludeLabel);
    if (params?.sort) searchParams.set("sort", params.sort);
    if (params?.order) searchParams.set("order", params.order);
    if (params?.random) searchParams.set("random", String(params.random));
    if (params?.labels?.length) searchParams.set("labels", params.labels.join(","));
    const qs = searchParams.toString();
    return apiFetch<Item[]>(`/items${qs ? `?${qs}` : ""}`);
  };

  getAllInventories = async (): Promise<Inventory[]> => {
    return await apiFetch<Inventory[]>("/inventory");
  };

  getInventories = async (params?: {
    owner?: string;
    excludeOwner?: string;
    type?: string;
    search?: string;
  }): Promise<Inventory[]> => {
    const searchParams = new URLSearchParams();
    if (params?.owner) searchParams.set("owner", params.owner);
    if (params?.excludeOwner) searchParams.set("excludeOwner", params.excludeOwner);
    if (params?.type) searchParams.set("type", params.type);
    if (params?.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    return apiFetch<Inventory[]>(`/inventory${qs ? `?${qs}` : ""}`);
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

  getItemsByLabels = async (labels: string[]): Promise<Item[]> => {
    if (labels.length === 0) return [];
    return apiFetch<Item[]>(`/items?labels=${encodeURIComponent(labels.join(","))}`);
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

  getMarket = async (search?: string): Promise<Market[]> => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return await apiFetch<Market[]>(`/market${qs}`);
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

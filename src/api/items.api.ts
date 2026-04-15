import { Item } from "@/types/items";
import { client } from "./client.api";

export default class ItemsApi {
  private readonly itemsCollection = client.collection("items");

  getAllItems = async (): Promise<Item[]> => {
    return await this.itemsCollection.getFullList();
  };
}

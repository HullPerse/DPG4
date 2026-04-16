import { Item } from "@/types/items";
import { client } from "./client.api";
import { fileFromUrl } from "@/lib/utils";

export default class ItemsApi {
  private readonly itemsCollection = client.collection("items");
  private readonly inventoryCollection = client.collection("inventory");

  getAllItems = async (): Promise<Item[]> => {
    return await this.itemsCollection.getFullList();
  };

  addItem = async (data: {
    label: string;
    description: string;
    charge: number;
    image: File | null;
  }): Promise<Item> => {
    const formData = new FormData();
    formData.append("label", data.label);
    formData.append("description", data.description);
    formData.append("charge", String(data.charge));

    if (data.image) {
      formData.append("image", data.image);
    }

    return await this.itemsCollection.create(formData);
  };

  getItemById = async (itemId: string): Promise<Item | undefined> => {
    return await this.itemsCollection.getOne(itemId);
  };

  addInventory = async (userId: string, itemId: string, image: string) => {
    const item = await this.getItemById(itemId);

    if (!item) return;

    const imageFile = await fileFromUrl(image);

    await this.inventoryCollection.create({
      owner: userId,
      image: imageFile,
      label: item.label,
      description: item.description,
      charge: item.charge,
    });
  };

  removeInventory = async () => {};

  useInventory = async () => {};

  chargeInventory = async () => {};
}

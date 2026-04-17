import { Inventory, Item, Market } from "@/types/items";
import { client, image } from "./client.api";
import { fileFromUrl } from "@/lib/utils";
import UserApi from "./user.api";
import { User } from "@/types/user";

const userApi = new UserApi();

export default class ItemsApi {
  private readonly itemsCollection = client.collection("items");
  private readonly inventoryCollection = client.collection("inventory");
  private readonly marketCollection = client.collection("market");

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

  getInventory = async (userId: string): Promise<Inventory[]> => {
    return await this.inventoryCollection.getFullList({
      filter: `owner = "${userId}"`,
    });
  };

  getInventoryById = async (inventoryId: string): Promise<Inventory> => {
    return await this.inventoryCollection.getOne(inventoryId);
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

  removeInventory = async (id: string) => {
    return await this.inventoryCollection.delete(id);
  };

  sendInventory = async (inventoryId: string, newOwner: string) => {
    return await this.inventoryCollection.update(inventoryId, {
      owner: newOwner,
    });
  };

  chargeInventory = async (
    inventoryId: string,
    oldCharge: number,
    newCharge: number,
  ) => {
    if (oldCharge + newCharge === 0) {
      return await this.removeInventory(inventoryId);
    }

    return await this.inventoryCollection.update(inventoryId, {
      charge: oldCharge + newCharge,
    });
  };

  sellInventory = async (inventoryId: string, owner: string, price: number) => {
    if (!price) return;

    const userData = (await userApi.getUserById(owner)) as User;
    const itemData = await this.getInventoryById(inventoryId);

    if (!userData || !itemData) return;

    const imageFile = await fileFromUrl(
      `${image.inventory}${itemData.id}/${itemData.image}`,
    );
    const data = {
      owner: {
        id: userData.id,
        username: userData.username,
        avatar: userData.avatar,
      },
      label: itemData.label,
      description: itemData.description,
      charge: itemData.charge,
      image: imageFile,
      price: price,
    } as Market;

    return await this.marketCollection.create(data).then(async () => {
      await this.removeInventory(String(itemData.id));
    });
  };

  useInventory = async () => {};

  getMarket = async (): Promise<Market[]> => {
    return await this.marketCollection.getFullList();
  };
}

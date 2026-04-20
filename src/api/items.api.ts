import { Inventory, Item, Market, Trade } from "@/types/items";
import { client, image } from "./client.api";
import { fileFromUrl } from "@/lib/utils";
import UserApi from "./user.api";
import { User } from "@/types/user";
import { Activity } from "@/types/activity";

export default class ItemsApi {
  private readonly itemsCollection = client.collection("items");
  private readonly inventoryCollection = client.collection("inventory");
  private readonly marketCollection = client.collection("market");
  private readonly activityCollection = client.collection("activity");

  private get userApi() {
    if (!this._userApi) this._userApi = new UserApi();
    return this._userApi;
  }
  private _userApi?: UserApi;

  getAllItems = async (): Promise<Item[]> => {
    return await this.itemsCollection.getFullList();
  };

  getAllInventories = async (): Promise<Inventory[]> => {
    return await this.inventoryCollection.getFullList();
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

    const user = await this.userApi.getUserById(userId);
    const activityData = {
      author: user.id,
      image: user.avatar,
      type: "emoji",
      text: `${user.username} получил предмет ${item.label}`,
    } as Activity;
    await this.activityCollection.create(activityData);
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

    const userData = (await this.userApi.getUserById(owner)) as User;
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

    const activityData = {
      author: userData?.id,
      image: userData.avatar,
      type: "emoji",
      text: `${userData.username} выставил на продажу предметт ${itemData.label} за ${price}`,
    } as Activity;
    await this.activityCollection.create(activityData);

    return await this.marketCollection.create(data).then(async () => {
      await this.removeInventory(String(itemData.id));
    });
  };

  tradeInventory = async (currentUser: Trade, otherUser: Trade) => {
    if (currentUser.money > 0) {
      await this.userApi.scoreUser(otherUser.id, currentUser.money);
      await this.userApi.scoreUser(currentUser.id, -currentUser.money);
    }

    //2. send items
    if (currentUser.items.length > 0) {
      for (const item of currentUser.items) {
        await this.sendInventory(item, otherUser.id);
      }
    }

    //other user => current user
    //1. send money
    if (otherUser.money > 0) {
      await this.userApi.scoreUser(currentUser.id, otherUser.money);
      await this.userApi.scoreUser(otherUser.id, -otherUser.money);
    }

    ///2. send items
    if (otherUser.items.length > 0) {
      for (const item of otherUser.items) {
        await this.sendInventory(item, currentUser.id);
      }
    }
  };

  getMarket = async (): Promise<Market[]> => {
    return await this.marketCollection.getFullList();
  };

  getMarketById = async (marketId: string): Promise<Market> => {
    return await this.marketCollection.getOne(marketId);
  };

  removeMarket = async (marketId: string) => {
    return await this.marketCollection.delete(marketId);
  };

  buyMarket = async (marketId: string, newOwner: string, oldOwner: string) => {
    const userMoney = await this.userApi.getUserScore(newOwner);
    const itemData = await this.getMarketById(marketId);

    if (!userMoney || userMoney < itemData.price) return;

    const imageFile = await fileFromUrl(
      `${image.market}${itemData.id}/${itemData.image}`,
    );

    const data = {
      owner: newOwner,
      label: itemData.label,
      description: itemData.description,
      charge: itemData.charge,
      image: imageFile,
    } as Inventory;

    await this.userApi.scoreUser(newOwner, -itemData.price);
    await this.userApi.scoreUser(oldOwner, itemData.price);

    const user = await this.userApi.getUserById(newOwner);

    const activityData = {
      author: user.id,
      image: user.avatar,
      type: "emoji",
      text: `${user.username} купил предмет ${itemData.label} за ${itemData.price}`,
    } as Activity;
    await this.activityCollection.create(activityData);

    return await this.inventoryCollection.create(data).then(async () => {
      await this.removeMarket(marketId);
    });
  };
}

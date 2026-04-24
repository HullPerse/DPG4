import { Ads } from "@/types/ads";
import { client } from "./client.api";
import UserApi from "./user.api";
import { User } from "@/types/user";
import { Activity } from "@/types/activity";

export const SUBSCRIPTION_COST = 2;

export default class AdsApi {
  private readonly adsCollection = client.collection("ads");
  private readonly activityCollection = client.collection("activity");

  getAds = async (): Promise<Ads[]> => {
    return await this.adsCollection.getFullList();
  };

  createAd = async (data: Ads) => {
    return await this.adsCollection.create(data);
  };

  removeAd = async (id: string) => {
    return await this.adsCollection.delete(id);
  };

  subscribeAd = async (userId: string) => {
    const usersApi = new UserApi();

    const currentUser = (await usersApi.getUserById(userId)) as User;

    if (!currentUser || currentUser.money < SUBSCRIPTION_COST) return;

    await usersApi.scoreUser(String(currentUser.id), -SUBSCRIPTION_COST);

    await usersApi.updateSubsription(String(currentUser.id), true);

    const activityData = {
      author: currentUser.id,
      image: currentUser.avatar,
      text: `${currentUser.username} оформил подписку за ${SUBSCRIPTION_COST} чубриков`,
    } as Activity;

    await this.activityCollection.create(activityData);
  };

  unsubscribedAd = async (userId: string) => {
    const usersApi = new UserApi();

    const currentUser = (await usersApi.getUserById(userId)) as User;

    if (!currentUser) return;

    await usersApi.updateSubsription(String(currentUser.id), false);

    const activityData = {
      author: currentUser.id,
      image: currentUser.avatar,
      text: `${currentUser.username} не хватило денег на подписку`,
    } as Activity;

    await this.activityCollection.create(activityData);
  };
}

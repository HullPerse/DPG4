import { Ads } from "@/types/ads";
import { client } from "./client.api";

export default class AdsApi {
  private readonly adsCollection = client.collection("ads");

  getAds = async (): Promise<Ads[]> => {
    return await this.adsCollection.getFullList();
  };

  createAd = async (data: Ads) => {
    return await this.adsCollection.create(data);
  };

  removeAd = async (id: string) => {
    return await this.adsCollection.delete(id);
  };
}

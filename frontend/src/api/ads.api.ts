import { Ads } from "@/types/ads";
import { apiFetch } from "./client.api";
import { filePayload } from "@/lib/fileBlob";

export const SUBSCRIPTION_COST = 2;
export const SUBSCRIPTION_CONTINUE = SUBSCRIPTION_COST / 2;

export default class AdsApi {
  getAds = async (): Promise<Ads[]> => apiFetch<Ads[]>("/ads");

  createAd = async (data: Ads) => {
    const image =
      data.image instanceof File ? await filePayload(data.image) : null;
    const audio =
      data.audio instanceof File ? await filePayload(data.audio) : null;

    return apiFetch("/ads", {
      method: "POST",
      body: {
        owner: data.owner,
        text: data.text,
        image,
        audio,
      },
    });
  };

  removeAd = async (id: string) =>
    apiFetch(`/ads/${id}`, { method: "DELETE" });

  subscribeAd = async (userId: string) =>
    apiFetch("/ads/subscribe", { method: "POST", body: { userId } });

  unsubscribedAd = async (userId: string) =>
    apiFetch("/ads/unsubscribe", { method: "POST", body: { userId } });
}

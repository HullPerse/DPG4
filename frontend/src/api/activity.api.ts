import { Activity } from "@/types/activity";
import { apiFetch } from "./client.api";

export default class ActivityApi {
  getActivity = async (): Promise<Activity[]> =>
    apiFetch<Activity[]>("/activity");

  getActivities = async (): Promise<Activity[]> => this.getActivity();

  createActivity = async (data: Activity) =>
    apiFetch("/activity", { method: "POST", body: data });
}

import { client } from "./client.api";
import { Activity } from "@/types/activity";

export default class ActivityApi {
  private readonly activityCollection = client.collection("activity");

  createActivity = async (data: Activity) => {
    return await this.activityCollection.create(data);
  };

  getActivities = async (): Promise<Activity[]> => {
    return await this.activityCollection.getFullList({
      sort: "-created",
    });
  };
}

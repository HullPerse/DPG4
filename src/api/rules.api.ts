import { Rule } from "@/types/rules";
import { client } from "./client.api";

export default class RulesApi {
  private readonly rulesCollection = client.collection("rules");

  getRules = async (): Promise<Rule[]> => {
    return await this.rulesCollection.getFullList();
  };
}

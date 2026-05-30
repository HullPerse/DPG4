import { Rule } from "@/types/rules";
import { apiFetch } from "./client.api";

export default class RulesApi {
  getRules = async (): Promise<Rule[]> => apiFetch<Rule[]>("/rules");
}

import { ReactNode } from "react";
import { ConsumeType, EffectType, ModalType } from "@/types/effect";
import { effectInterface, ItemLabel } from "@/types/items";
import ItemsApi from "@/api/items.api";
import ActivityApi from "@/api/activity.api";
import { useUserStore } from "@/store/user.store";
import { Activity } from "@/types/activity";

const itemsApi = new ItemsApi();
const activityApi = new ActivityApi();

export default class ItemFramework {
  constructor(private label: ItemLabel) {}

  consume: ConsumeType = async (activityText) => {
    const user = useUserStore.getState().user;

    if (!user) return;

    const inventory = await itemsApi
      .getInventory(String(user.id))
      .then((r) => r.find((i) => i.label === this.label));

    if (!inventory) return;

    await itemsApi.chargeInventory(String(inventory.id), inventory.charge, -1);

    const activityData = {
      author: user.id,
      image: user.avatar,
      text: activityText,
    } as Activity;

    await activityApi.createActivity(activityData);
  };

  static effect(
    label: ItemLabel,
    handler: (ctx: EffectType) => Promise<void>,
  ): effectInterface {
    return {
      label,
      type: "effect",
      effect: async () => {
        const user = useUserStore.getState().user;

        if (!user) return;

        const framework = new ItemFramework(label);

        await handler({ user, consume: framework.consume });
      },
    };
  }

  static modal(
    label: ItemLabel,
    renderBody: (ctx: ModalType) => ReactNode,
  ): effectInterface {
    return {
      label,
      type: "modal",
      body: (close) => {
        const user = useUserStore.getState().user;

        if (!user) return;

        const framework = new ItemFramework(label);

        return renderBody({ user, close, consume: framework.consume });
      },
    };
  }
}

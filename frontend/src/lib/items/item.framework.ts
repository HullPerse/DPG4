import type { FC } from "react";
import type { ConsumeType, ModalType } from "@/types/effect";
import type { effectInterface, ItemLabel } from "@/types/items";
import { apiFetch } from "@/api/client.api";
import { itemsApi } from "@/api/items.api";
import { useUserStore } from "@/store/user.store";

export default class ItemFramework {
  constructor(
    private label: ItemLabel,
    private userId?: string,
  ) {}

  consume: ConsumeType = async (activityText) => {
    if (!this.userId) return;

    const inventory = await itemsApi
      .getInventory(this.userId)
      .then((r) => r.find((i) => i.label === this.label));

    if (!inventory) return;

    await apiFetch(`/inventory/${inventory.id}/consume`, {
      method: "POST",
      body: { activityText },
    });
  };

  static effect(
    label: ItemLabel,
    handler: (ctx: import("@/types/effect").EffectType) => Promise<void>,
  ): effectInterface {
    return {
      label,
      type: "effect",
      effect: async () => {
        const user = useUserStore.getState().user;
        if (!user) return;

        const framework = new ItemFramework(label, user.id);
        await handler({ user, consume: framework.consume });
      },
    };
  }

  static modal(
    label: ItemLabel,
    create: () => FC<ModalType>,
  ): effectInterface {
    return {
      label,
      type: "modal",
      Modal: create(),
    };
  }
}

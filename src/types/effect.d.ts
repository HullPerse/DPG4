export interface EffectType {
  user: User;
  consume: ConsumeType;
}

export interface ModalType {
  user: User;
  close: () => void;
  consume: ConsumeType;
}

export type ConsumeType = (activityText: string) => Promise<void>;

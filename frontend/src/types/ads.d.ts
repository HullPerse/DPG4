import { RecordMeta } from "./record";

export interface Ads extends RecordMeta {
  owner: {
    username: string;
    id: string;
  };
  image: File | string;
  audio?: File | string;
  text: string;
}

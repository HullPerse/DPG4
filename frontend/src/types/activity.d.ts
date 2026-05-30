import { RecordMeta } from "./record";

export interface Activity extends RecordMeta {
  author: string;
  image: string | null;
  type: "image" | "emoji" | "chat";
  text: string;
}

export type UpdateData = {
  id: string;
  author: string;
  image: string | null;
  type: "image" | "emoji" | "chat";
  text: string;
  created: string;
  timeout: number;
  showClose?: boolean;
  onClick: {
    fn: () => void;
    icon: React.ReactNode;
  };
};

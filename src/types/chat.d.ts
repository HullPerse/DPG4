import { RecordMeta } from "./record";

export interface Chat extends RecordMeta {
  data: {
    receiver: {
      username: string;
      id: string;
      avatar: string;
      color: string;
    };
    sender: {
      username: string;
      id: string;
      avatar: string;
      color: string;
    };
  };
  message: string;
  image: string | null;
  isRead: boolean;
}

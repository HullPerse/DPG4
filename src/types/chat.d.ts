export interface Chat {
  id: string;
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
  image: File | null;
  created: string;
  updated: string;
}

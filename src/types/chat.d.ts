export interface Chat {
  id: string;
  data: {
    receiver: {
      username: string;
      id: string;
    };
    sender: {
      username: string;
      id: string;
    };
  };
  message: string;
  created: string;
  updated: string;
}

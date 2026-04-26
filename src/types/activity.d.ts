export interface Activity {
  id?: string;
  author: string;
  image: string | null;
  type: "image" | "emoji" | "chat";
  text: string;
  created: string;
  updated?: string;
}

export type UpdateData = Activity & {
  timeout: number;
  showClose?: boolean;
  onClick: {
    fn: () => void;
    icon: React.ReactNode;
  };
};

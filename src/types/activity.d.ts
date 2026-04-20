export interface Activity {
  id?: string;
  author: string;
  image: string | null;
  type: "image" | "emoji" | "chat";
  text: string;
  created: string;
}

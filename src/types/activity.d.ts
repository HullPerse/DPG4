export interface Activity {
  id?: string;
  image: string | null;
  type: "image" | "emoji" | "chat";
  text: string;
  created: string;
}

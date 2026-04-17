export interface Activity {
  id?: string;
  image: string | null;
  type: "image" | "emoji";
  text: string;
  created: string;
}

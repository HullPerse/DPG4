export interface PaintType {
  id?: string;
  author: {
    id: string;
    username: string;
  };
  image: File;
}

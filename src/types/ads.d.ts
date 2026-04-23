export interface Ads {
  id?: string;
  owner: {
    username: string;
    id: string;
  };
  image: File;
  text: string;
  created?: string;
}

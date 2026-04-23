export interface Ads {
  id?: string;
  owner: {
    username: string;
    id: string;
  };
  image: File | string;
  text: string;
  created?: string;
}

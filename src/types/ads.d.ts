export interface Ads {
  id?: string;
  owner: {
    username: string;
    id: string;
  };
  image: File | string;
  audio?: File | string;
  text: string;
  created?: string;
}

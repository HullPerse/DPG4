import PocketBase from "pocketbase";

export const URL = import.meta.env.VITE_POCKETBASE;

export const client = new PocketBase(import.meta.env.VITE_POCKETBASE);

export const image = {
  game: `${URL}api/files/pbc_879072730/`,
  chat: `${URL}api/files/pbc_3861817060/`,
  items: `${URL}api/files/pbc_710432678/`,
};

export const checkConnection = async () => {
  try {
    await client.health.check();
    return true;
  } catch {
    return false;
  }
};

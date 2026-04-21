import PocketBase from "pocketbase";

export const URL = "http://26.15.36.191:8090/";

export const client = new PocketBase(URL);

client.autoCancellation(false);

export const image = {
  game: `${URL}api/files/pbc_879072730/`,
  chat: `${URL}api/files/pbc_3861817060/`,
  items: `${URL}api/files/pbc_710432678/`,
  inventory: `${URL}api/files/pbc_3573984430/`,
  market: `${URL}api/files/pbc_1556084869/`,
};

export const checkConnection = async () => {
  try {
    await client.health.check();
    return true;
  } catch {
    return false;
  }
};

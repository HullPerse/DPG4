import PocketBase from "pocketbase";

export const URL = "http://127.0.0.1:8090/";

export const client = new PocketBase(URL);

export const image = {
  game: `${URL}api/files/pbc_879072730/`,
};

export const checkConnection = async () => {
  try {
    await client.health.check();
    return true;
  } catch {
    return false;
  }
};

import PocketBase from "pocketbase";

export const client = new PocketBase("http://127.0.0.1:8090");

export const checkConnection = async () => {
  try {
    await client.health.check();
    return true;
  } catch {
    return false;
  }
};

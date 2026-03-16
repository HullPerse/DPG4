import { memo } from "react";

function GameLibrary({ id }: { id: string }) {
  return <main>{id}</main>;
}

export default memo(GameLibrary);

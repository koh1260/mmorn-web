import { Socket } from "socket.io-client";
import { Pawn } from "@/game/entities/players/pawn";
import { Phaser } from "@/game/phaser";
import { UserInfo } from "@/types/socket-io/response";
import { PawnColor, pawnColors } from "@/constants/game/entities";
import { InputManager } from "@/game/managers/input-manager";

class SpawnManager {
  spawnPlayer(
    scene: Phaser.Scene,
    userInfo: UserInfo,
    x: number,
    y: number,
    isMe = false,
    inputManager?: InputManager,
    io?: Socket
  ) {
    console.log(userInfo.id);
    const { avatarKey } = userInfo;
    const avatarInfo = avatarKey.split("_");

    const avatarName = avatarInfo[1];

    if (avatarName === "pawn") {
      const color = avatarInfo[0] as PawnColor;

      const hasColor = pawnColors.includes(color);
      return new Pawn(
        scene,
        x,
        y,
        hasColor ? color : "blue",
        userInfo,
        isMe,
        inputManager,
        io
      );
    }

    return new Pawn(scene, x, y, "blue", userInfo, isMe, inputManager, io);
  }
}

export const spawnManager = new SpawnManager();

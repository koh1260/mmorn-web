import { Phaser } from "@/game/phaser";
import { BootScene } from "@/game/scenes/boot-scene";
import { LobyScene } from "@/game/scenes/loby-scene";
import { IslandScene } from "@/game/scenes/island-scene";

export class GameSingleton {
  private static instance: Phaser.Game | null = null;

  private constructor() {}

  static getInstance(width: number, height: number) {
    this.destroy();
    this.instance = new Phaser.Game({
      type: Phaser.AUTO,
      width,
      height,
      canvasStyle: "display: none",
      parent: "game-containter",
      scene: [BootScene, LobyScene, IslandScene],
      // scale: {
      //   mode: Phaser.Scale.RESIZE,
      //   autoCenter: Phaser.Scale.CENTER_BOTH,
      // },
      render: {
        antialias: false,
        pixelArt: true,
        roundPixels: true,
      },
      fps: {
        target: 60,
        forceSetTimeOut: true,
      },
      physics: {
        default: "matter",
        matter: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
    });

    return this.instance;
  }

  static destroy() {
    if (this.instance) {
      this.instance.destroy(true);
    }
  }
}

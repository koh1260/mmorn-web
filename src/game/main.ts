import { Phaser } from "@/game/phaser";
import { BootScene } from "@/game/scenes/boot-scene";
import { LobyScene } from "@/game/scenes/loby-scene";
import { IslandScene } from "@/game/scenes/island-scene";
import { StoreScene } from "@/game/scenes/store-scene";
import PhotoScene from "@/game/scenes/photo-scene";
import { MyIslandScene } from "@/game/scenes/my-island-scene";

export class GameSingleton {
  private static instance: Phaser.Game | null = null;
  private static storeInstance: Phaser.Game | null = null;

  private constructor() {}

  static getInstance() {
    this.destroy();
    this.instance = new Phaser.Game({
      type: Phaser.AUTO,
      canvasStyle: "opacity: 0",
      parent: "game-container",
      scene: [BootScene, LobyScene, IslandScene, PhotoScene, MyIslandScene],
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
      scale: {
        mode: Phaser.Scale.RESIZE,
        parent: "game-container",
        width: window.innerWidth,
        height: window.innerHeight,
      },
      plugins: {
        scene: [
          {
            key: "LightsPlugin",
            plugin: Phaser.GameObjects.LightsPlugin,
            mapping: "lights",
          },
        ],
      },
    });

    return this.instance;
  }

  static getStoreInstance(width: number, height: number) {
    this.destroy();
    this.storeInstance = new Phaser.Game({
      type: Phaser.AUTO,
      width,
      height,
      canvasStyle: "opacity: 0",
      parent: "game-container",
      scene: [StoreScene],
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

    return this.storeInstance;
  }

  static destroy() {
    if (this.instance) {
      // 모든 씬을 완전히 정리
      this.instance.scene.scenes.forEach((scene) => {
        if (scene.scene.isActive()) {
          scene.scene.stop();
        }
        scene.scene.remove();
      });

      // 게임 인스턴스 파괴
      this.instance.destroy(true);
      this.instance = null;
    }

    if (this.storeInstance) {
      // 모든 씬을 완전히 정리
      this.storeInstance.scene.scenes.forEach((scene) => {
        if (scene.scene.isActive()) {
          scene.scene.stop();
        }
        scene.scene.remove();
      });

      // 게임 인스턴스 파괴
      this.storeInstance.destroy(true);
      this.storeInstance = null;
    }
  }
}

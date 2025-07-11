import { getItem, persistItem } from "@/utils/persistence";

export class SoundManager {
  private static instance: SoundManager | null = null;
  private currentScene: Phaser.Scene;
  private sound: Phaser.Sound.BaseSoundManager;
  private bgm: Phaser.Sound.BaseSound | null = null;
  private isFocused = true;

  private baseVolume = 0.15;
  private volumeWeight = 1;

  private constructor(scene: Phaser.Scene) {
    this.currentScene = scene;
    this.sound = scene.sound;

    window.addEventListener("blur", () => {
      this.isFocused = false;
    });

    window.addEventListener("focus", () => {
      this.isFocused = true;
    });
  }

  public static init(scene: Phaser.Scene) {
    // 씬이 다르면 새로 초기화
    if (!this.instance || this.instance.currentScene !== scene) {
      this.instance = new SoundManager(scene);
    }
    return this.instance;
  }

  public static getInstance(): SoundManager {
    if (!this.instance) {
      throw new Error("SoundManager not initialized");
    }
    return this.instance;
  }

  public static getInstanceSafe(): SoundManager | null {
    return this.instance || null;
  }

  public static destroy() {
    if (this.instance) {
      this.instance.cleanup();
      this.instance = null;
    }
  }

  public playBgm(key: string, initVolume = 0.2, loop = true) {
    this.baseVolume = initVolume;

    let volumeWeight = getItem("sound_volume") ?? 1;
    if (volumeWeight > 1) volumeWeight = 1;

    const volume = this.baseVolume * volumeWeight;
    this.sound.volume = volume;

    if (this.bgm?.isPlaying) {
      this.bgm.stop();
    }
    this.bgm = this.sound.add(key, { loop });
    this.bgm.play();
  }

  public pauseBgm() {
    if (this.bgm?.isPlaying) {
      this.bgm.pause();
    }
  }

  public resumeBgm() {
    if (this.bgm?.isPaused) {
      this.bgm.resume();
    }
  }

  public stopBgm() {
    this.bgm?.pause();
  }

  public playSfx(key: string, volume = 1) {
    if (this.isFocused) {
      this.sound.play(key, { volume });
    }
  }

  public stopAll() {
    this.sound.stopAll();
  }

  public setVolume(volumeWeight: number) {
    this.volumeWeight = volumeWeight;
    const volume = this.baseVolume * this.volumeWeight;

    this.sound.volume = volume;
    persistItem("sound_volume", volumeWeight);
  }

  private cleanup() {
    // 모든 사운드 정지
    this.stopAll();

    // BGM 정지
    if (this.bgm) {
      this.bgm.stop();
      this.bgm.destroy();
      this.bgm = null;
    }

    // 이벤트 리스너 제거
    window.removeEventListener("blur", () => {
      this.isFocused = false;
    });
    window.removeEventListener("focus", () => {
      this.isFocused = true;
    });
  }
}

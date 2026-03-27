import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { GameScene } from './scenes/GameScene'
import { GameOverScene } from './scenes/GameOverScene'
import { VsBootScene } from './scenes/VsBootScene'
import { VsGameScene } from './scenes/VsGameScene'
import { GAME_WIDTH, GAME_HEIGHT } from './constants'
import { VS_GAME_WIDTH, VS_GAME_HEIGHT, VS_MOBILE_GAME_WIDTH, VS_MOBILE_GAME_HEIGHT } from './vs-constants'

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    transparent: true,
    disableVisibilityChange: true,
    scene: [BootScene, GameScene, GameOverScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    fps: {
      target: 60,
    },
    render: {
      pixelArt: false,
      antialias: true,
      roundPixels: true,
    },
  }
}

export function createVsGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: VS_GAME_WIDTH,
    height: VS_GAME_HEIGHT,
    parent,
    transparent: true,
    disableVisibilityChange: true,
    scene: [VsBootScene, VsGameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    },
    fps: {
      target: 60,
    },
    render: {
      pixelArt: false,
      antialias: true,
      roundPixels: true,
    },
  }
}

export function createVsMobileGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: VS_MOBILE_GAME_WIDTH,
    height: VS_MOBILE_GAME_HEIGHT,
    parent,
    transparent: true,
    disableVisibilityChange: true,
    scene: [VsBootScene, VsGameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    fps: {
      target: 60,
    },
    render: {
      pixelArt: false,
      antialias: true,
      roundPixels: true,
    },
  }
}

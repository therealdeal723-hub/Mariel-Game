import Phaser from 'phaser';

// Game resolution
export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 768;

// Color palette
export const COLORS = {
  background: 0x1a1a2e,
  primary: 0xe94560,
  secondary: 0x16213e,
  accent: 0x0f3460,
  text: 0xffffff,
  gold: 0xffd700,
  success: 0x4ecca3,
  error: 0xff6b6b,
  warmLight: 0xfff3e0,
};

// Stage registry — add new stages here as we build them
export const STAGES = [
  {
    id: 'first-date',
    title: 'First Date',
    subtitle: 'Axe Throwing',
    scene: 'AxeThrowingStage',
    intro: [
      { speaker: 'narrator', text: 'It all started with a first date...' },
      { speaker: 'narrator', text: 'What better way to get to know someone than throwing sharp objects?' },
    ],
    outro: [
      { speaker: 'narrator', text: 'Despite the "loss"... sparks were already flying.' },
    ],
    music: 'first-date-theme',
  },
  {
    id: 'moving-in',
    title: 'Moving In Together',
    subtitle: 'Our First Home',
    scene: 'UnpackingStage',
    intro: [
      { speaker: 'narrator', text: 'Things were getting serious...' },
      { speaker: 'narrator', text: 'Time to combine two lives into one home.' },
    ],
    outro: [
      { speaker: 'narrator', text: 'It was starting to feel like home.' },
    ],
    music: 'moving-in-theme',
  },
  // More stages will be added here as we build them
];

// Phaser game configuration
export const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.background,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Scenes are added dynamically in main.js
  scene: [],
};

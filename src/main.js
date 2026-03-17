import Phaser from 'phaser';
import { gameConfig } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { StageSelectScene } from './scenes/StageSelectScene.js';
import { StageIntroScene } from './scenes/StageIntroScene.js';
import { StageOutroScene } from './scenes/StageOutroScene.js';
import { ProposalScene } from './scenes/ProposalScene.js';
import { AxeThrowingStage } from './stages/AxeThrowingStage.js';
import { UnpackingStage } from './stages/UnpackingStage.js';

// Register all scenes
const config = {
  ...gameConfig,
  scene: [
    BootScene,
    TitleScene,
    StageSelectScene,
    StageIntroScene,
    StageOutroScene,
    AxeThrowingStage,
    UnpackingStage,
    ProposalScene,
  ],
};

// Launch the game
const game = new Phaser.Game(config);

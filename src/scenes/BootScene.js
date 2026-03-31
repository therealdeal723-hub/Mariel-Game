import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Show a loading bar
    const barWidth = 400;
    const barHeight = 30;
    const barX = (GAME_WIDTH - barWidth) / 2;
    const barY = GAME_HEIGHT / 2;

    // Loading text
    const loadingText = this.add.text(GAME_WIDTH / 2, barY - 50, 'Loading Our Story...', {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      color: '#e94560',
    }).setOrigin(0.5);

    // Progress bar background
    const barBg = this.add.rectangle(GAME_WIDTH / 2, barY, barWidth, barHeight, 0x16213e);

    // Progress bar fill
    const barFill = this.add.rectangle(barX + 2, barY, 0, barHeight - 4, COLORS.primary);
    barFill.setOrigin(0, 0.5);

    // Update progress bar as assets load
    this.load.on('progress', (value) => {
      barFill.width = (barWidth - 4) * value;
    });

    this.load.on('complete', () => {
      loadingText.setText('Ready!');
    });

    // Character sprites
    this.load.svg('char-mariel', 'assets/images/characters/mariel.svg', { width: 80, height: 120 });
    this.load.svg('char-nick', 'assets/images/characters/nick.svg', { width: 80, height: 120 });

    // Plants (Monsteras)
    this.load.svg('item-monstera-deliciosa', 'assets/images/plants/monstera-deliciosa.svg', { width: 128, height: 128 });
    this.load.svg('item-monstera-adansonii', 'assets/images/plants/monstera-adansonii.svg', { width: 128, height: 128 });
    this.load.svg('item-monstera-thai', 'assets/images/plants/monstera-thai.svg', { width: 128, height: 128 });
    this.load.svg('item-monstera-albo', 'assets/images/plants/monstera-albo.svg', { width: 128, height: 128 });
    this.load.svg('item-monstera-peru', 'assets/images/plants/monstera-peru.svg', { width: 128, height: 128 });
    this.load.svg('item-mini-monstera', 'assets/images/plants/mini-monstera.svg', { width: 128, height: 128 });

    // Designer Bags
    this.load.svg('item-birkin', 'assets/images/bags/birkin.svg', { width: 128, height: 128 });
    this.load.svg('item-chanel-flap', 'assets/images/bags/chanel-flap.svg', { width: 128, height: 128 });
    this.load.svg('item-lv-neverfull', 'assets/images/bags/lv-neverfull.svg', { width: 128, height: 128 });
    this.load.svg('item-dior-saddle', 'assets/images/bags/dior-saddle.svg', { width: 128, height: 128 });
    this.load.svg('item-ysl-envelope', 'assets/images/bags/ysl-envelope.svg', { width: 128, height: 128 });

    // Jackets
    this.load.svg('item-leather-jacket', 'assets/images/jackets/leather-jacket.svg', { width: 128, height: 128 });
    this.load.svg('item-denim-jacket', 'assets/images/jackets/denim-jacket.svg', { width: 128, height: 128 });
    this.load.svg('item-blazer', 'assets/images/jackets/blazer.svg', { width: 128, height: 128 });

    // Scarves
    this.load.svg('item-silk-scarf', 'assets/images/scarves/silk-scarf.svg', { width: 128, height: 128 });
    this.load.svg('item-cashmere-wrap', 'assets/images/scarves/cashmere-wrap.svg', { width: 128, height: 128 });
    this.load.svg('item-knit-scarf', 'assets/images/scarves/knit-scarf.svg', { width: 128, height: 128 });

    // Baking Equipment
    this.load.svg('item-stand-mixer', 'assets/images/baking/stand-mixer.svg', { width: 128, height: 128 });
    this.load.svg('item-rolling-pin', 'assets/images/baking/rolling-pin.svg', { width: 128, height: 128 });
    this.load.svg('item-whisk', 'assets/images/baking/whisk.svg', { width: 128, height: 128 });
    this.load.svg('item-mixing-bowls', 'assets/images/baking/mixing-bowls.svg', { width: 128, height: 128 });
    this.load.svg('item-measuring-cups', 'assets/images/baking/measuring-cups.svg', { width: 128, height: 128 });
    this.load.svg('item-piping-bag', 'assets/images/baking/piping-bag.svg', { width: 128, height: 128 });
    this.load.svg('item-cake-stand', 'assets/images/baking/cake-stand.svg', { width: 128, height: 128 });
    this.load.svg('item-oven-mitts', 'assets/images/baking/oven-mitts.svg', { width: 128, height: 128 });
  }

  create() {
    // Small delay so the player can see "Ready!" then transition to title
    this.time.delayedCall(500, () => {
      this.scene.start('TitleScene');
    });
  }
}

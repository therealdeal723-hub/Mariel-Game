import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ─── Asset existence tests ──────────────────────────────────────────

const ASSET_ROOT = resolve(import.meta.dirname, '../public/assets/images');

const EXPECTED_SVGS = [
  // Characters
  'characters/mariel.svg',
  'characters/nick.svg',
  // Plants
  'plants/monstera-deliciosa.svg',
  'plants/monstera-adansonii.svg',
  'plants/monstera-thai.svg',
  'plants/monstera-albo.svg',
  'plants/monstera-peru.svg',
  'plants/mini-monstera.svg',
  // Bags
  'bags/birkin.svg',
  'bags/chanel-flap.svg',
  'bags/lv-neverfull.svg',
  'bags/dior-saddle.svg',
  'bags/ysl-envelope.svg',
  // Jackets
  'jackets/leather-jacket.svg',
  'jackets/denim-jacket.svg',
  'jackets/blazer.svg',
  // Scarves
  'scarves/silk-scarf.svg',
  'scarves/cashmere-wrap.svg',
  'scarves/knit-scarf.svg',
  // Baking
  'baking/stand-mixer.svg',
  'baking/rolling-pin.svg',
  'baking/whisk.svg',
  'baking/mixing-bowls.svg',
  'baking/measuring-cups.svg',
  'baking/piping-bag.svg',
  'baking/cake-stand.svg',
  'baking/oven-mitts.svg',
];

describe('SVG assets', () => {
  for (const svgPath of EXPECTED_SVGS) {
    it(`${svgPath} exists and is valid SVG`, () => {
      const full = resolve(ASSET_ROOT, svgPath);
      expect(existsSync(full), `Missing file: ${svgPath}`).toBe(true);
      const content = readFileSync(full, 'utf-8');
      expect(content).toContain('<svg');
      expect(content).toContain('</svg>');
      expect(content.length).toBeGreaterThan(100);
    });
  }
});

// ─── BootScene preload coverage ─────────────────────────────────────

describe('BootScene preloads all assets', () => {
  const bootSrc = readFileSync(
    resolve(import.meta.dirname, '../src/scenes/BootScene.js'),
    'utf-8'
  );

  it('loads both character sprites', () => {
    expect(bootSrc).toContain("'char-mariel'");
    expect(bootSrc).toContain("'char-nick'");
  });

  // Every item texture key referenced in UnpackingStage must be preloaded
  const unpackingSrc = readFileSync(
    resolve(import.meta.dirname, '../src/stages/UnpackingStage.js'),
    'utf-8'
  );
  const textureKeys = [...unpackingSrc.matchAll(/texture:\s*'([^']+)'/g)].map(m => m[1]);

  for (const key of textureKeys) {
    it(`preloads texture '${key}'`, () => {
      expect(bootSrc).toContain(`'${key}'`);
    });
  }
});

// ─── Item data integrity ────────────────────────────────────────────

describe('Unpacking items', () => {
  // Parse ITEMS from source (avoid importing Phaser)
  const src = readFileSync(
    resolve(import.meta.dirname, '../src/stages/UnpackingStage.js'),
    'utf-8'
  );

  // Extract item ids
  const itemIds = [...src.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);

  it('has 25 items', () => {
    expect(itemIds.length).toBe(25);
  });

  it('has no duplicate ids', () => {
    expect(new Set(itemIds).size).toBe(itemIds.length);
  });

  // Every item should have Nick commentary
  const commentKeys = [...src.matchAll(/^\s+'([\w-]+)':\s*'/gm)].map(m => m[1]);

  it('every item has Nick commentary', () => {
    for (const id of itemIds) {
      expect(commentKeys, `Missing commentary for '${id}'`).toContain(id);
    }
  });

  // Items must fit in the 8x6 grid
  it('all items fit within the 8x6 grid (48 cells)', () => {
    // Extract shape arrays: shape: [[0,0],[1,0]]
    const shapeMatches = [...src.matchAll(/shape:\s*(\[\[[\d,\[\]\s]+\])/g)];
    let totalCells = 0;
    for (const m of shapeMatches) {
      // Count the number of [x,y] pairs
      const cellCount = (m[1].match(/\[(\d+),(\d+)\]/g) || []).length;
      totalCells += cellCount;
    }
    expect(totalCells).toBeLessThanOrEqual(48);
  });
});

// ─── Hard difficulty is actually hard ───────────────────────────────

describe('Axe throwing difficulty', () => {
  const src = readFileSync(
    resolve(import.meta.dirname, '../src/stages/AxeThrowingStage.js'),
    'utf-8'
  );

  it('hard difficulty has very tight accuracy (<=5)', () => {
    // Extract hard block
    const hardBlock = src.match(/hard:\s*\{[\s\S]*?\}/);
    expect(hardBlock).not.toBeNull();
    const accMatch = hardBlock[0].match(/accuracyRange:\s*(\d+)/);
    expect(Number(accMatch[1])).toBeLessThanOrEqual(5);
  });

  it('hard difficulty has high hit chance (>=0.95)', () => {
    const hardBlock = src.match(/hard:\s*\{[\s\S]*?\}/);
    const hitMatch = hardBlock[0].match(/hitChance:\s*([\d.]+)/);
    expect(Number(hitMatch[1])).toBeGreaterThanOrEqual(0.95);
  });

  it('hard difficulty has very low miss chance (<=0.02)', () => {
    const hardBlock = src.match(/hard:\s*\{[\s\S]*?\}/);
    const missMatch = hardBlock[0].match(/missChance:\s*([\d.]+)/);
    expect(Number(missMatch[1])).toBeLessThanOrEqual(0.02);
  });

  it('hard difficulty has high power minimum (>=95)', () => {
    const hardBlock = src.match(/hard:\s*\{[\s\S]*?\}/);
    const powerMatch = hardBlock[0].match(/powerMin:\s*(\d+)/);
    expect(Number(powerMatch[1])).toBeGreaterThanOrEqual(95);
  });
});

// ─── Character sprite size ──────────────────────────────────────────

describe('Character sprites in axe throwing', () => {
  const src = readFileSync(
    resolve(import.meta.dirname, '../src/stages/AxeThrowingStage.js'),
    'utf-8'
  );

  it('Mariel sprite uses char-mariel image', () => {
    expect(src).toContain("'char-mariel'");
  });

  it('Nick sprite uses char-nick image', () => {
    expect(src).toContain("'char-nick'");
  });

  it('character sprites are at least 80px wide', () => {
    // Check setDisplaySize calls near char-mariel
    const marielBlock = src.match(/char-mariel[\s\S]{0,100}setDisplaySize\((\d+)/);
    expect(marielBlock).not.toBeNull();
    expect(Number(marielBlock[1])).toBeGreaterThanOrEqual(80);
  });
});

// ─── Unpacking pop animation fix ────────────────────────────────────

describe('Unpacking pop animation fix', () => {
  const src = readFileSync(
    resolve(import.meta.dirname, '../src/stages/UnpackingStage.js'),
    'utf-8'
  );

  it('captures target scale BEFORE setScale(0)', () => {
    // The correct order: setDisplaySize -> targetScaleX = icon.scaleX -> setScale(0)
    const displaySizeIdx = src.indexOf('setDisplaySize(80, 80)');
    const captureIdx = src.indexOf('const targetScaleX = icon.scaleX');
    const setZeroIdx = src.indexOf('icon.setScale(0)');

    expect(displaySizeIdx).toBeGreaterThan(-1);
    expect(captureIdx).toBeGreaterThan(-1);
    expect(setZeroIdx).toBeGreaterThan(-1);

    // targetScale capture must come BEFORE setScale(0)
    expect(captureIdx).toBeLessThan(setZeroIdx);
    // setDisplaySize must come BEFORE capture
    expect(displaySizeIdx).toBeLessThan(captureIdx);
  });
});

// ─── Box hit area disables during drag ──────────────────────────────

describe('Box hit area management', () => {
  const src = readFileSync(
    resolve(import.meta.dirname, '../src/stages/UnpackingStage.js'),
    'utf-8'
  );

  it('disables box hit area when item is popped', () => {
    expect(src).toContain('boxHitArea.disableInteractive()');
  });

  it('re-enables box hit area after item is placed', () => {
    expect(src).toContain('boxHitArea.setInteractive');
  });
});

// ─── Mobile vs desktop control scheme ───────────────────────────────

describe('Mobile vs desktop controls', () => {
  const src = readFileSync(
    resolve(import.meta.dirname, '../src/stages/AxeThrowingStage.js'),
    'utf-8'
  );

  it('has isMobile detection', () => {
    expect(src).toContain('isMobile');
    expect(src).toContain('pointer: coarse');
  });

  it('uses pointermove only on desktop', () => {
    // pointermove should be inside an else (desktop) block
    expect(src).toContain("} else {\n      // DESKTOP: mouse continuously moves");
  });

  it('uses pointerdown for mobile aiming', () => {
    expect(src).toContain('// MOBILE: tap on the target area');
  });

  it('hides throw button on desktop', () => {
    expect(src).toContain('if (!this.isMobile)');
    expect(src).toContain('throwBtn.setVisible(false)');
  });
});

// ─── Favicon ────────────────────────────────────────────────────────

describe('Favicon', () => {
  const html = readFileSync(
    resolve(import.meta.dirname, '../index.html'),
    'utf-8'
  );

  it('has a heart favicon', () => {
    expect(html).toContain('rel="icon"');
    expect(html).toContain('❤');
  });
});

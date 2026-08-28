// ============================================================
// WORLD.JS — Scene data (data-driven so new areas can be added
// later without touching engine code). Each scene has:
//   - pixel dimensions
//   - a ground tile grid (grass/path/water, purely visual+collision)
//   - decorations (trees/rocks/houses — each with its own hitbox)
//   - exits (rect -> target scene + spawn point)
//   - npc/enemy/interactable spawn data (behavior lives in entities.js)
//
// To add a new area later (Hidden Cave, Deep Woods, Wolf Den,
// Ruined Shrine, Ancient Gate — per the full map design) you
// only need to add a new entry to SCENES and wire an exit to it.
// Nothing in game.js needs to change.
// ============================================================

const TILE = 16;
const GROUND = { GRASS: 0, PATH: 1, WATER: 2, FLOWER: 3 };

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeGroundGrid(cols, rows, seed) {
  const rand = mulberry32(seed);
  const grid = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      row.push(rand() < 0.05 ? GROUND.FLOWER : GROUND.GRASS);
    }
    grid.push(row);
  }
  return grid;
}

function carvePath(grid, x1, y1, x2, y2, width) {
  width = width || 2;
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const px = Math.round(x1 + (x2 - x1) * t);
    const py = Math.round(y1 + (y2 - y1) * t);
    for (let dx = -Math.floor(width / 2); dx <= Math.floor(width / 2); dx++) {
      for (let dy = -Math.floor(width / 2); dy <= Math.floor(width / 2); dy++) {
        const gx = px + dx, gy = py + dy;
        if (grid[gy] && grid[gy][gx] !== undefined) grid[gy][gx] = GROUND.PATH;
      }
    }
  }
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function borderTrees(cols, rows) {
  const trees = [];
  for (let x = 0; x < cols; x++) {
    trees.push({ type: "tree", x: x * TILE - 4, y: -6, solid: true, border: true });
    trees.push({ type: "tree", x: x * TILE - 4, y: rows * TILE - 22, solid: true, border: true });
  }
  for (let y = 1; y < rows - 1; y++) {
    trees.push({ type: "tree", x: -6, y: y * TILE - 6, solid: true, border: true });
    trees.push({ type: "tree", x: cols * TILE - 22, y: y * TILE - 6, solid: true, border: true });
  }
  return trees;
}

// Removes border trees that would block an exit gap so the player
// can actually walk through. Run once at load time per scene.
function pruneExitBlockers(scene) {
  scene.decorations = scene.decorations.filter((d) => {
    if (!d.border) return true;
    const box = { x: d.x, y: d.y, w: 28, h: 28 };
    return !scene.exits.some((ex) => rectsOverlap(box, ex.rect));
  });
}

const SCENES = {
  // ==========================================================
  greenvale: {
    id: "greenvale",
    name: "Greenvale Village",
    cols: 26, rows: 16,
    ambient: "village",
    build() {
      const grid = makeGroundGrid(this.cols, this.rows, 7);
      carvePath(grid, 4, 8, 22, 8, 3);
      carvePath(grid, 13, 2, 13, 14, 2);
      return grid;
    },
    decorations: [
      ...borderTrees(26, 16),
      { type: "house", x: 32, y: 24, w: 56, h: 44, solid: true },
      { type: "house", x: 110, y: 20, w: 56, h: 44, solid: true },
      { type: "tree", x: 200, y: 30, solid: true },
      { type: "tree", x: 230, y: 60, solid: true },
      { type: "tree", x: 60, y: 130, solid: true },
      { type: "rock", x: 250, y: 130, solid: true },
      { type: "dummy", x: 300, y: 150, solid: true, interactKey: "trainingDummy" },
    ],
    exits: [
      { rect: { x: 400, y: 100, w: 16, h: 60 }, target: "forestPath", spawn: { x: 24, y: 130, dir: "down" } },
    ],
    npcs: [
      { id: "kai", type: "kai", x: 210, y: 150 },
      { id: "elderMira", type: "villager", x: 70, y: 90, name: "Mira", palette: { shirt: "#6b4a8a", hair: "#c9c0b0" } },
    ],
  },

  // ==========================================================
  forestPath: {
    id: "forestPath",
    name: "Forest Path",
    cols: 26, rows: 16,
    ambient: "forest",
    build() {
      const grid = makeGroundGrid(this.cols, this.rows, 22);
      carvePath(grid, 2, 8, 24, 8, 3);
      return grid;
    },
    decorations: [
      ...borderTrees(26, 16),
      { type: "tree", x: 120, y: 40, solid: true },
      { type: "tree", x: 140, y: 100, solid: true },
      { type: "tree", x: 180, y: 60, solid: true },
      { type: "tree", x: 90, y: 170, solid: true },
      { type: "rock", x: 250, y: 170, solid: true },
      { type: "rock", x: 60, y: 190, solid: true },
      { type: "sign", x: 60, y: 200, solid: true, interactKey: "signWolfDen" },
    ],
    exits: [
      { rect: { x: 0, y: 100, w: 16, h: 60 }, target: "greenvale", spawn: { x: 390, y: 130, dir: "left" } },
      { rect: { x: 400, y: 100, w: 16, h: 60 }, target: "woodsEntrance", spawn: { x: 24, y: 130, dir: "down" } },
    ],
    npcs: [],
  },

  // ==========================================================
  woodsEntrance: {
    id: "woodsEntrance",
    name: "Whispering Woods",
    cols: 26, rows: 16,
    ambient: "forest",
    build() {
      const grid = makeGroundGrid(this.cols, this.rows, 41);
      carvePath(grid, 2, 8, 13, 8, 3);
      carvePath(grid, 13, 8, 13, 1, 2);
      return grid;
    },
    decorations: [
      ...borderTrees(26, 16),
      { type: "tree", x: 60, y: 40, solid: true },
      { type: "tree", x: 300, y: 50, solid: true },
      { type: "tree", x: 320, y: 130, solid: true },
      { type: "tree", x: 60, y: 170, solid: true },
      { type: "rock", x: 180, y: 170, solid: true },
      { type: "sign", x: 340, y: 190, solid: true, interactKey: "signAncientGate" },
      { type: "sign", x: 40, y: 60, solid: true, interactKey: "signHiddenCave" },
    ],
    exits: [
      { rect: { x: 0, y: 100, w: 16, h: 60 }, target: "forestPath", spawn: { x: 390, y: 130, dir: "left" } },
      { rect: { x: 192, y: 0, w: 32, h: 16 }, target: "crystalClearing", spawn: { x: 150, y: 190, dir: "up" }, requiresFlag: "wolfCleared" },
    ],
    npcs: [
      { id: "forestWolf", type: "wolf", x: 210, y: 90 },
    ],
  },

  // ==========================================================
  crystalClearing: {
    id: "crystalClearing",
    name: "The Crystal Clearing",
    cols: 19, rows: 14,
    ambient: "mystery",
    build() {
      return makeGroundGrid(this.cols, this.rows, 63);
    },
    decorations: [
      ...borderTrees(19, 14),
      { type: "rock", x: 60, y: 60, solid: true },
      { type: "rock", x: 220, y: 70, solid: true },
      { type: "rock", x: 60, y: 160, solid: true },
      { type: "rock", x: 220, y: 160, solid: true },
    ],
    exits: [
      { rect: { x: 130, y: 195, w: 40, h: 16 }, target: "woodsEntrance", spawn: { x: 150, y: 20, dir: "down" } },
    ],
    npcs: [
      { id: "theCrystal", type: "crystal", x: 140, y: 90 },
    ],
  },
};

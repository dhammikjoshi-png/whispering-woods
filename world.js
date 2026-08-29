// ============================================================
// WORLD.JS — Environment & Tilemap Renderer with Pixel Textures
// ============================================================

const World = {
  tileSize: 16,
  cols: 40,
  rows: 30,
  time: 0,

  // Map Tile Definitions: 0: Grass, 1: Path, 2: Water, 3: Fence, 4: Wall
  map: [
    // 40x30 Grid initialized dynamically or loaded
  ],

  init() {
    this.map = new Array(this.rows * this.cols).fill(0);
    this.generateGreenvale();
  },

  update(dt) {
    this.time += dt;
  },

  generateGreenvale() {
    // Generate default Greenvale tile map layout
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const idx = r * this.cols + c;
        // Border trees/walls
        if (r <= 2 || r >= this.rows - 3 || c <= 2 || c >= this.cols - 3) {
          this.map[idx] = 4; // Tree wall
        } 
        // Main Crossroads Path
        else if ((c >= 18 && c <= 21) || (r >= 13 && r <= 16)) {
          this.map[idx] = 1; // Dirt Path
        } 
        // Default Grass
        else {
          this.map[idx] = 0;
        }
      }
    }
  },

  // Seeded Pseudo-Random function for consistent detail scattering
  pseudoRandom(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  },

  // Draw Ground Layer: Grass, Paths, Flowers, Clutter, and Water
  drawGround(ctx, viewport) {
    const startCol = Math.max(0, Math.floor(viewport.x / this.tileSize));
    const endCol = Math.min(this.cols, Math.ceil((viewport.x + viewport.w) / this.tileSize));
    const startRow = Math.max(0, Math.floor(viewport.y / this.tileSize));
    const endRow = Math.min(this.rows, Math.ceil((viewport.y + viewport.h) / this.tileSize));

    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const x = c * this.tileSize;
        const y = r * this.tileSize;
        const tile = this.map[r * this.cols + c] || 0;
        const rand = this.pseudoRandom(c, r);

        if (tile === 1) {
          // --- Textured Dirt / Cobblestone Path ---
          ctx.fillStyle = "#a88958";
          ctx.fillRect(x, y, this.tileSize, this.tileSize);
          
          // Pebble details
          ctx.fillStyle = "#8a6d40";
          if (rand > 0.3) ctx.fillRect(x + 2, y + 3, 3, 2);
          if (rand > 0.6) ctx.fillRect(x + 9, y + 10, 4, 3);
          ctx.fillStyle = "#c2a36e";
          if (rand > 0.4) ctx.fillRect(x + 6, y + 5, 2, 2);

          // Irregular Grass Edge Overlap
          ctx.fillStyle = "#2d542f";
          if (this.map[r * this.cols + (c - 1)] === 0 && rand > 0.3) ctx.fillRect(x, y, 3, this.tileSize);
          if (this.map[r * this.cols + (c + 1)] === 0 && rand > 0.3) ctx.fillRect(x + 13, y, 3, this.tileSize);
          if (this.map[(r - 1) * this.cols + c] === 0 && rand > 0.3) ctx.fillRect(x, y, this.tileSize, 3);
          if (this.map[(r + 1) * this.cols + c] === 0 && rand > 0.3) ctx.fillRect(x, y + 13, this.tileSize, 3);

        } else if (tile === 2) {
          // --- Animated Water ---
          const wave = Math.sin(this.time * 3 + c + r) * 2;
          ctx.fillStyle = "#2b5c8f";
          ctx.fillRect(x, y, this.tileSize, this.tileSize);
          ctx.fillStyle = "#437ebd";
          ctx.fillRect(x + wave, y + 4, 8, 2);
          ctx.fillRect(x + 4 - wave, y + 11, 6, 2);

        } else {
          // --- Base Grass Texture with Pixel Variation ---
          ctx.fillStyle = "#2d542f";
          ctx.fillRect(x, y, this.tileSize, this.tileSize);

          // Subtle Grass Blade Noise
          ctx.fillStyle = rand > 0.5 ? "#37663a" : "#244526";
          ctx.fillRect(x + Math.floor(rand * 10), y + Math.floor(rand * 8), 2, 4);
          if (rand > 0.7) {
            ctx.fillStyle = "#467d4a";
            ctx.fillRect(x + Math.floor(rand * 6) + 2, y + Math.floor(rand * 6) + 2, 2, 2);
          }

          // --- Scatter Environmental Clutter ---
          if (rand > 0.88) {
            // Wildflowers (Red, Yellow, White)
            const flowerColors = ["#e84a4a", "#f5cb42", "#ffffff"];
            ctx.fillStyle = flowerColors[Math.floor(rand * 10) % flowerColors.length];
            ctx.fillRect(x + 6, y + 6, 3, 3);
            ctx.fillStyle = "#223b23";
            ctx.fillRect(x + 7, y + 9, 1, 3);
          } else if (rand > 0.82) {
            // Fallen Leaves / Small Rock
            ctx.fillStyle = rand > 0.85 ? "#8b3a3a" : "#636663";
            ctx.fillRect(x + 4, y + 5, 3, 2);
          }
        }
      }
    }
  },

  // Draw Props & Y-Sorted Structures (Houses, Fences, Trees, Lanterns)
  drawStructures(ctx) {
    // Village Houses
    Sprites.drawHouse(ctx, 80, 110, 64, 64);
    Sprites.drawHouse(ctx, 160, 110, 64, 64);

    // Fences
    for (let i = 0; i < 6; i++) {
      Sprites.drawFence(ctx, 50 + i * 16, 175);
    }

    // Street Lanterns
    Sprites.drawLantern(ctx, 270, 170);
    Sprites.drawLantern(ctx, 350, 260);

    // Outer Forest Tree Canopy Borders
    for (let c = 1; c < this.cols - 1; c += 2) {
      Sprites.drawTree(ctx, c * 16 - 8, 0);
      Sprites.drawTree(ctx, c * 16 - 8, 16);
      Sprites.drawTree(ctx, c * 16 - 8, (this.rows - 3) * 16);
    }
    for (let r = 2; r < this.rows - 2; r += 2) {
      Sprites.drawTree(ctx, 0, r * 16);
      Sprites.drawTree(ctx, (this.cols - 2) * 16, r * 16);
    }
  }
};

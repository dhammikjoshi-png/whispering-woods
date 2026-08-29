// ============================================================
// GAME.JS — Main Loop, Atmospheric Depth & Dynamic Lighting
// ============================================================

const Game = {
  canvas: null,
  ctx: null,
  lastTime: 0,
  viewport: { x: 0, y: 0, w: 640, h: 360 },

  init() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    
    // Internal pixel-art resolution
    this.canvas.width = 640;
    this.canvas.height = 360;

    if (typeof World !== "undefined") World.init();
    if (typeof Entities !== "undefined" && Entities.init) Entities.init();

    requestAnimationFrame(this.loop.bind(this));
  },

  loop(timestamp) {
    const dt = Math.min((timestamp - (this.lastTime || timestamp)) / 1000, 0.1);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  },

  update(dt) {
    if (typeof World !== "undefined") World.update(dt);
    if (typeof Entities !== "undefined" && Entities.update) Entities.update(dt);
  },

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();

    // 1. Render Ground Textures, Paths & Water
    if (typeof World !== "undefined") World.drawGround(ctx, this.viewport);

    // 2. Render Tree & Structure Ground Shadows
    this.renderGroundShadows(ctx);

    // 3. Render World Props & Y-Sorted Entities
    if (typeof World !== "undefined") World.drawStructures(ctx);
    if (typeof Entities !== "undefined" && Entities.draw) Entities.draw(ctx);

    // 4. Dynamic Warm Lantern & Window Lighting Pass
    this.renderLightingOverlay(ctx);

    // 5. Atmospheric Depth / Forest Fog Pass
    this.renderAtmosphericFog(ctx);

    ctx.restore();
  },

  // Soft Ground Drop Shadows for Canopy & Buildings
  renderGroundShadows(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(10, 20, 10, 0.35)";

    // Canopy Border Shadows
    ctx.fillRect(0, 0, 640, 42);
    ctx.fillRect(0, 310, 640, 50);
    ctx.fillRect(0, 0, 38, 360);
    ctx.fillRect(602, 0, 38, 360);

    // Cottage Shadows
    ctx.beginPath();
    ctx.ellipse(112, 172, 34, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(192, 172, 34, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  // Warm Ambient Lighting for Lanterns & Cottage Windows
  renderLightingOverlay(ctx) {
    ctx.save();
    // Soft ambient twilight tint
    ctx.fillStyle = "rgba(18, 25, 35, 0.25)";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.globalCompositeOperation = "lighter";

    // Lantern Glow at (273, 183)
    const lanternGrad1 = ctx.createRadialGradient(273, 183, 2, 273, 183, 36);
    lanternGrad1.addColorStop(0, "rgba(245, 203, 66, 0.45)");
    lanternGrad1.addColorStop(1, "rgba(245, 203, 66, 0)");
    ctx.fillStyle = lanternGrad1;
    ctx.beginPath();
    ctx.arc(273, 183, 36, 0, Math.PI * 2);
    ctx.fill();

    // Lantern Glow at (353, 273)
    const lanternGrad2 = ctx.createRadialGradient(353, 273, 2, 353, 273, 36);
    lanternGrad2.addColorStop(0, "rgba(245, 203, 66, 0.45)");
    lanternGrad2.addColorStop(1, "rgba(245, 203, 66, 0)");
    ctx.fillStyle = lanternGrad2;
    ctx.beginPath();
    ctx.arc(353, 273, 36, 0, Math.PI * 2);
    ctx.fill();

    // Cottage Window Glows
    const windowGlow = (wx, wy) => {
      const g = ctx.createRadialGradient(wx, wy, 1, wx, wy, 20);
      g.addColorStop(0, "rgba(255, 215, 115, 0.5)");
      g.addColorStop(1, "rgba(255, 215, 115, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(wx, wy, 20, 0, Math.PI * 2);
      ctx.fill();
    };

    windowGlow(90, 140);
    windowGlow(130, 140);
    windowGlow(170, 140);
    windowGlow(210, 140);

    ctx.restore();
  },

  // Depth Vignette & Atmospheric Fog Pass
  renderAtmosphericFog(ctx) {
    ctx.save();
    
    // Outer Vignette
    const vignette = ctx.createRadialGradient(320, 180, 180, 320, 180, 380);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(10, 18, 12, 0.45)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 640, 360);

    ctx.restore();
  }
};

window.addEventListener("load", () => Game.init());

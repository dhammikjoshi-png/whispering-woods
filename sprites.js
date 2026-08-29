// ============================================================
// SPRITES.JS — Pixel-art procedural rendering engine
// ============================================================

const Sprites = {
  drawHumanoid(ctx, x, y, opts) {
    const {
      dir = "down",
      walkPhase = 0,
      skin = "#e8c39e",
      hair = "#4a3222",
      shirt = "#4d7a4d",
      pants = "#3a3a5c",
      stage = "child",
      hurt = false,
    } = opts;

    const proportions = {
      child: { w: 14, bodyH: 8, headH: 8, legH: 4 },
      teen: { w: 15, bodyH: 10, headH: 7, legH: 5 },
      adult: { w: 16, bodyH: 11, headH: 7, legH: 6 },
    };
    const p = proportions[stage] || proportions.child;
    const legOffset = Math.sin(walkPhase) > 0 ? 1 : -1;
    const skinColor = hurt ? "#ff8b8b" : skin;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (dir === "left") {
      ctx.scale(-1, 1);
      ctx.translate(-p.w, 0);
    }

    const cx = p.w / 2;

    // Soft drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(cx, p.headH + p.bodyH + p.legH - 1, cx - 1, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = pants;
    ctx.fillRect(cx - 5, p.headH + p.bodyH - 2, 4, p.legH + legOffset);
    ctx.fillRect(cx + 1, p.headH + p.bodyH - 2, 4, p.legH - legOffset);

    // Body
    ctx.fillStyle = shirt;
    ctx.fillRect(cx - 6, p.headH, 12, p.bodyH);

    // Arms
    ctx.fillStyle = skinColor;
    ctx.fillRect(cx - 8, p.headH + 1, 3, p.bodyH - 3);
    ctx.fillRect(cx + 5, p.headH + 1, 3, p.bodyH - 3);

    // Head
    ctx.fillStyle = skinColor;
    ctx.fillRect(cx - 6, 0, 12, p.headH);

    // Hair
    ctx.fillStyle = hair;
    if (dir === "up") {
      ctx.fillRect(cx - 6, 0, 12, p.headH - 1);
    } else {
      ctx.fillRect(cx - 6, 0, 12, 3);
      ctx.fillRect(cx - 6, 3, 2, 3);
      ctx.fillRect(cx + 4, 3, 2, 3);
    }

    // Face
    if (dir === "down") {
      ctx.fillStyle = "#2b2118";
      ctx.fillRect(cx - 3, p.headH - 4, 2, 2);
      ctx.fillRect(cx + 1, p.headH - 4, 2, 2);
    } else if (dir === "left" || dir === "right") {
      ctx.fillStyle = "#2b2118";
      ctx.fillRect(cx + 2, p.headH - 4, 2, 2);
    }

    ctx.restore();
  },

  // Dense Pixel Pine Tree (Greenvale Style)
  drawTree(ctx, x, y) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(16, 30, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    ctx.fillStyle = "#3d2514";
    ctx.fillRect(13, 20, 6, 12);
    ctx.fillStyle = "#2b1a0e";
    ctx.fillRect(17, 20, 2, 12); // trunk shadow

    // Layered Pine Foliage Blocks
    const layers = [
      { y: 16, w: 26, h: 8, baseCol: "#1c381e", hiCol: "#2d542f" },
      { y: 10, w: 22, h: 8, baseCol: "#234525", hiCol: "#37663a" },
      { y: 4,  w: 16, h: 8, baseCol: "#2d542f", hiCol: "#467d4a" },
      { y: -2, w: 10, h: 7, baseCol: "#37663a", hiCol: "#59995e" }
    ];

    layers.forEach(l => {
      const startX = 16 - l.w / 2;
      ctx.fillStyle = l.baseCol;
      ctx.fillRect(startX, l.y, l.w, l.h);
      // Pixel highlights
      ctx.fillStyle = l.hiCol;
      ctx.fillRect(startX + 2, l.y, l.w - 4, 3);
    });

    ctx.restore();
  },

  // Detailed Village Cottage with Warm Glowing Windows
  drawHouse(ctx, x, y, w = 64, h = 64) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    // House Base / Timber Walls
    ctx.fillStyle = "#4a3b2c"; // Dark timber border
    ctx.fillRect(2, h * 0.35, w - 4, h * 0.65);
    ctx.fillStyle = "#8c7355"; // Plaster/wood fill
    ctx.fillRect(4, h * 0.35 + 2, w - 8, h * 0.65 - 4);

    // Stone Foundation
    ctx.fillStyle = "#4a4d4a";
    ctx.fillRect(2, h - 8, w - 4, 8);
    ctx.fillStyle = "#636663";
    ctx.fillRect(4, h - 7, w / 2, 3);

    // Roof (Red-Brick Shingles)
    ctx.fillStyle = "#2b1212"; // Roof outline
    ctx.fillRect(0, h * 0.15, w, h * 0.22);
    ctx.fillStyle = "#8b3a3a"; // Shingle main
    ctx.fillRect(2, h * 0.15 + 2, w - 4, h * 0.22 - 2);
    ctx.fillStyle = "#a84848"; // Roof peak highlight
    ctx.fillRect(4, h * 0.15 + 2, w - 8, 3);

    // Chimney
    ctx.fillStyle = "#3d2b27";
    ctx.fillRect(w - 16, 2, 8, 14);

    // Wooden Door
    ctx.fillStyle = "#2b1a0e";
    ctx.fillRect(w / 2 - 6, h - 20, 12, 20);
    ctx.fillStyle = "#d9a441"; // Door knob
    ctx.fillRect(w / 2 + 3, h - 10, 2, 2);

    // Glowing Windows
    const drawWindow = (wx, wy) => {
      // Window frame
      ctx.fillStyle = "#2b1a0e";
      ctx.fillRect(wx, wy, 10, 10);
      // Yellow Glow
      ctx.fillStyle = "#f5cb42";
      ctx.fillRect(wx + 1, wy + 1, 8, 8);
      // Window Crossbar
      ctx.fillStyle = "#2b1a0e";
      ctx.fillRect(wx + 4, wy, 2, 10);
      ctx.fillRect(wx, wy + 4, 10, 2);
    };

    drawWindow(10, h * 0.45);
    drawWindow(w - 20, h * 0.45);

    ctx.restore();
  },

  // Hanging Streetlight Lantern with Radial Glow
  drawLantern(ctx, x, y) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    // Wooden Post
    ctx.fillStyle = "#3d2514";
    ctx.fillRect(6, 4, 4, 24);

    // Iron Arm
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(2, 4, 10, 2);
    ctx.fillRect(2, 6, 2, 4);

    // Lantern Box
    ctx.fillStyle = "#f5cb42";
    ctx.fillRect(1, 10, 4, 6);

    // Radial Light Glow
    const gradient = ctx.createRadialGradient(3, 13, 1, 3, 13, 18);
    gradient.addColorStop(0, "rgba(245, 203, 66, 0.6)");
    gradient.addColorStop(1, "rgba(245, 203, 66, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(3, 13, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  // Fence Post
  drawFence(ctx, x, y) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.fillStyle = "#4a3222";
    ctx.fillRect(2, 0, 4, 16);
    ctx.fillRect(10, 0, 4, 16);
    ctx.fillStyle = "#63442e";
    ctx.fillRect(0, 4, 16, 3);
    ctx.fillRect(0, 10, 16, 3);
    ctx.restore();
  },

  drawWolf(ctx, x, y, opts) {
    const { walkPhase = 0, hurt = false, aggro = false } = opts;
    const legOffset = Math.sin(walkPhase) > 0 ? 1 : -1;
    const body = hurt ? "#c98d8d" : aggro ? "#5c5c68" : "#6b6b78";

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    ctx.fillStyle = "#3f3f48";
    ctx.fillRect(2, 12 + legOffset, 3, 4);
    ctx.fillRect(11, 12 - legOffset, 3, 4);

    ctx.fillStyle = body;
    ctx.fillRect(1, 5, 14, 8);
    ctx.fillRect(10, 1, 7, 6);

    ctx.fillStyle = "#3f3f48";
    ctx.fillRect(10, 0, 2, 2);
    ctx.fillRect(14, 0, 2, 2);

    ctx.fillStyle = aggro ? "#ff4d4d" : "#e8d84a";
    ctx.fillRect(14, 3, 2, 2);

    ctx.fillStyle = "#3f3f48";
    ctx.fillRect(-2, 6, 3, 3);

    ctx.restore();
  },

  drawRock(ctx, x, y) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.fillStyle = "#4a4d4a";
    ctx.fillRect(2, 6, 12, 8);
    ctx.fillStyle = "#636663";
    ctx.fillRect(4, 4, 8, 4);
    ctx.fillStyle = "#84847a";
    ctx.fillRect(4, 4, 3, 2);
    ctx.restore();
  },

  drawDummy(ctx, x, y) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.fillStyle = "#8a6a4a";
    ctx.fillRect(6, 4, 4, 20);
    ctx.fillStyle = "#c9a876";
    ctx.beginPath();
    ctx.arc(8, 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a08050";
    ctx.fillRect(0, 10, 16, 3);
    ctx.restore();
  },

  drawCrystal(ctx, x, y, opts) {
    const { glowPhase = 0, awakened = false } = opts;
    const glow = (Math.sin(glowPhase) + 1) / 2;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    const baseColor = awakened ? "#9b7fd4" : "#6f9bd4";
    const coreColor = awakened ? "#e0d4ff" : "#cfe4ff";

    if (awakened || glow > 0.3) {
      ctx.save();
      ctx.globalAlpha = 0.15 + glow * 0.25;
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(10, 12, 16 + glow * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(10, -2);
    ctx.lineTo(18, 10);
    ctx.lineTo(10, 26);
    ctx.lineTo(2, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = coreColor;
    ctx.globalAlpha = 0.6 + glow * 0.4;
    ctx.beginPath();
    ctx.moveTo(10, 3);
    ctx.lineTo(14, 10);
    ctx.lineTo(10, 19);
    ctx.lineTo(6, 10);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  },

  drawVillager(ctx, x, y, opts) {
    Sprites.drawHumanoid(ctx, x, y, {
      ...opts,
      stage: "adult",
      shirt: opts.shirt || "#8a6a3e",
      pants: opts.pants || "#4a4a3a",
      hair: opts.hair || "#5a4530",
    });
  },
};

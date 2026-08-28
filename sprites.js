// ============================================================
// SPRITES.JS — Procedural pixel-art style rendering
// Characters are built from small blocky rectangles snapped to
// a pixel grid rather than bitmap images, so no asset files are
// needed and recoloring/resizing (growth stages) is trivial.
// ============================================================

const Sprites = {
  // Draws a simple blocky humanoid. `stage` changes proportions:
  // child = big head / short body, teen = medium, adult = normal/taller.
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

    // Legs (behind body slightly)
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

    // Face (only visible facing down/side)
    if (dir === "down") {
      ctx.fillStyle = "#2b2118";
      ctx.fillRect(cx - 3, p.headH - 4, 2, 2);
      ctx.fillRect(cx + 1, p.headH - 4, 2, 2);
    } else if (dir === "left" || dir === "right") {
      // Drawn at the same local offset for both; the "left" branch above
      // already mirrors the whole canvas, so this one offset covers both
      // directions correctly instead of needing two mirrored constants.
      ctx.fillStyle = "#2b2118";
      ctx.fillRect(cx + 2, p.headH - 4, 2, 2);
    }

    ctx.restore();
  },

  drawWolf(ctx, x, y, opts) {
    const { walkPhase = 0, hurt = false, aggro = false } = opts;
    const legOffset = Math.sin(walkPhase) > 0 ? 1 : -1;
    const body = hurt ? "#c98d8d" : aggro ? "#5c5c68" : "#6b6b78";

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    // Legs
    ctx.fillStyle = "#3f3f48";
    ctx.fillRect(2, 12 + legOffset, 3, 4);
    ctx.fillRect(11, 12 - legOffset, 3, 4);

    // Body
    ctx.fillStyle = body;
    ctx.fillRect(1, 5, 14, 8);

    // Head
    ctx.fillRect(10, 1, 7, 6);

    // Ears
    ctx.fillStyle = "#3f3f48";
    ctx.fillRect(10, 0, 2, 2);
    ctx.fillRect(14, 0, 2, 2);

    // Eye
    ctx.fillStyle = aggro ? "#ff4d4d" : "#e8d84a";
    ctx.fillRect(14, 3, 2, 2);

    // Tail
    ctx.fillStyle = "#3f3f48";
    ctx.fillRect(-2, 6, 3, 3);

    ctx.restore();
  },

  drawTree(ctx, x, y) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.fillStyle = "#4a3620";
    ctx.fillRect(11, 20, 6, 10);
    ctx.fillStyle = "#2d4a2d";
    ctx.beginPath();
    ctx.arc(14, 12, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#376337";
    ctx.beginPath();
    ctx.arc(9, 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  drawRock(ctx, x, y) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.fillStyle = "#6b6b62";
    ctx.fillRect(2, 6, 12, 8);
    ctx.fillStyle = "#84847a";
    ctx.fillRect(4, 4, 8, 4);
    ctx.restore();
  },

  drawHouse(ctx, x, y, w, h) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.fillStyle = "#7a5c3e";
    ctx.fillRect(0, h * 0.4, w, h * 0.6);
    ctx.fillStyle = "#8b3a3a";
    ctx.beginPath();
    ctx.moveTo(-4, h * 0.42);
    ctx.lineTo(w / 2, -4);
    ctx.lineTo(w + 4, h * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(w * 0.4, h * 0.65, w * 0.2, h * 0.35);
    ctx.fillStyle = "#cfe0e8";
    ctx.fillRect(w * 0.15, h * 0.55, w * 0.15, w * 0.15);
    ctx.fillRect(w * 0.7, h * 0.55, w * 0.15, w * 0.15);
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

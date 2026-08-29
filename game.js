// ============================================================
// GAME.JS — Greenvale visual/gameplay engine
// Preserves the original scene, entity, dialogue, save/load,
// combat and progression systems while using the new textured
// Sprites/World renderer and mobile controls.
// ============================================================

const Game = {
  canvas: null,
  ctx: null,

  player: null,
  currentScene: null,
  currentGroundGrid: null,

  entities: [],
  solids: [],
  flags: {},

  paused: false,
  lastTime: 0,
  lastBlockedToast: 0,
  toastTimer: 0,

  async init() {
    this.canvas = document.getElementById("gameCanvas");

    if (!this.canvas) {
      console.error("Game canvas not found");
      return;
    }

    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;

    // ----------------------------------------------------------
    // IMPORTANT: initialize the original input system.
    // This brings back joystick + attack + interact buttons.
    // ----------------------------------------------------------
    if (typeof Input !== "undefined" && Input.init) {
      Input.init();
    }

    this.player = new Player(60, 130);

    this._bindUI();

    // Audio
    if (typeof AudioSys !== "undefined" && AudioSys.init) {
      AudioSys.init();
    }

    // ----------------------------------------------------------
    // Load saved game
    // ----------------------------------------------------------
    let save = null;

    if (typeof Storage !== "undefined" && Storage.load) {
      save = await Storage.load("ww-save");
    }

    if (save) {
      this.flags = save.flags || {};

      this.player.stage = save.stage || "child";
      this.player.maxHp = save.maxHp || STAGE_MAXHP.child;
      this.player.hp =
        save.hp != null ? save.hp : this.player.maxHp;

      this.loadScene(
        save.sceneId || "greenvale",
        {
          x: save.playerX || 60,
          y: save.playerY || 130,
          dir: save.playerDir || "down",
        }
      );

      this.showToast("Welcome back to Whispering Woods");
    } else {
      this.loadScene(
        "greenvale",
        {
          x: 60,
          y: 130,
          dir: "down",
        }
      );

      setTimeout(() => {
        this.showToast("Use the joystick / arrow keys to move");
      }, 600);
    }

    // Dialogue
    const dialogueBox = document.getElementById("dialogueBox");

    if (dialogueBox) {
      dialogueBox.addEventListener("click", () => {
        if (
          typeof DialogueSys !== "undefined" &&
          DialogueSys.advance
        ) {
          DialogueSys.advance();
        }
      });
    }

    // Resume audio after user interaction
    document.body.addEventListener(
      "touchstart",
      () => {
        if (typeof AudioSys !== "undefined" && AudioSys.resume) {
          AudioSys.resume();
        }
      },
      { once: true }
    );

    document.body.addEventListener(
      "mousedown",
      () => {
        if (typeof AudioSys !== "undefined" && AudioSys.resume) {
          AudioSys.resume();
        }
      },
      { once: true }
    );

    // Start loop
    requestAnimationFrame((t) => this.loop(t));
  },

  // ============================================================
  // UI
  // ============================================================

  _bindUI() {
    const pauseBtn = document.getElementById("pauseBtn");
    const resumeBtn = document.getElementById("resumeBtn");
    const saveBtn = document.getElementById("saveBtn");
    const loadBtn = document.getElementById("loadBtn");
    const restartBtn = document.getElementById("restartBtn");

    if (pauseBtn) {
      pauseBtn.onclick = () => this.togglePause();
    }

    if (resumeBtn) {
      resumeBtn.onclick = () => this.togglePause();
    }

    if (saveBtn) {
      saveBtn.onclick = async () => {
        await this.persistState();
        this.showToast("Game saved");
      };
    }

    if (loadBtn) {
      loadBtn.onclick = async () => {
        if (
          typeof Storage === "undefined" ||
          !Storage.load
        ) {
          this.showToast("Save system unavailable");
          return;
        }

        const save = await Storage.load("ww-save");

        if (!save) {
          this.showToast("No save found");
          return;
        }

        this.flags = save.flags || {};

        this.player.stage =
          save.stage || "child";

        this.player.maxHp =
          save.maxHp || STAGE_MAXHP.child;

        this.player.hp =
          save.hp != null
            ? save.hp
            : this.player.maxHp;

        this.loadScene(
          save.sceneId || "greenvale",
          {
            x: save.playerX || 60,
            y: save.playerY || 130,
            dir: save.playerDir || "down",
          }
        );

        document.getElementById("pauseMenu").style.display = "none";

        this.paused = false;

        this.showToast("Game loaded");
      };
    }

    if (restartBtn) {
      restartBtn.onclick = () => {
        this.flags = {};

        this.player.stage = "child";
        this.player.maxHp = STAGE_MAXHP.child;
        this.player.hp = this.player.maxHp;

        this.loadScene(
          "greenvale",
          {
            x: 60,
            y: 130,
            dir: "down",
          }
        );

        document.getElementById("pauseMenu").style.display = "none";

        this.paused = false;

        this.showToast("Slice restarted");
      };
    }
  },

  togglePause() {
    if (
      typeof DialogueSys !== "undefined" &&
      DialogueSys.active
    ) {
      return;
    }

    this.paused = !this.paused;

    const menu = document.getElementById("pauseMenu");

    if (menu) {
      menu.style.display =
        this.paused ? "flex" : "none";
    }
  },

  setPaused(v) {
    this.paused = v;
  },

  // ============================================================
  // Story flags
  // ============================================================

  setFlag(key, value) {
    this.flags[key] = value;
    this.persistState();
  },

  // ============================================================
  // Save
  // ============================================================

  async persistState() {
    if (
      typeof Storage === "undefined" ||
      !Storage.save ||
      !this.currentScene ||
      !this.player
    ) {
      return;
    }

    await Storage.save("ww-save", {
      flags: this.flags,

      sceneId: this.currentScene.id,

      playerX: this.player.x,
      playerY: this.player.y,
      playerDir: this.player.dir,

      hp: this.player.hp,
      maxHp: this.player.maxHp,

      stage: this.player.stage,
    });
  },

  // ============================================================
  // Toast
  // ============================================================

  showToast(text, duration = 2.4) {
    const el = document.getElementById("toast");

    if (!el) return;

    el.textContent = text;
    el.style.opacity = "1";

    this.toastTimer = duration;
  },

  // ============================================================
  // Scene loading
  // ============================================================

  loadScene(id, spawn) {
    const def = SCENES[id];

    if (!def) {
      console.error("Unknown scene:", id);
      return;
    }

    if (!def._pruned) {
      pruneExitBlockers(def);
      def._pruned = true;
    }

    this.currentScene = def;

    // Original gameplay ground grid
    this.currentGroundGrid = def.build();

    // ----------------------------------------------------------
    // IMPORTANT:
    // Canvas remains based on the actual scene dimensions.
    // ----------------------------------------------------------
    this.canvas.width = def.cols * TILE;
    this.canvas.height = def.rows * TILE;

    // Collision solids
    this.solids = def.decorations
      .filter((d) => d.solid)
      .map(getDecorationSolidRect);

    // Interactive objects
    const interactables = def.decorations
      .filter((d) => d.interactKey)
      .map((d) => {
        if (d.type === "dummy") {
          return new TrainingDummy(d);
        }

        return new Interactable(d);
      });

    // NPCs / enemies
    const npcEntities = def.npcs.map((n) =>
      makeEntity(n)
    );

    this.entities = [
      ...interactables,
      ...npcEntities,
    ];

    // Player spawn
    this.player.x = spawn.x;
    this.player.y = spawn.y;

    if (spawn.dir) {
      this.player.dir = spawn.dir;
    }

    // Audio
    if (
      typeof AudioSys !== "undefined" &&
      AudioSys.setAmbient
    ) {
      AudioSys.setAmbient(def.ambient);
    }

    // Location label
    const locationLabel =
      document.getElementById("locationLabel");

    if (locationLabel) {
      locationLabel.textContent =
        def.name.toUpperCase();
    }
  },

  // ============================================================
  // Interaction
  // ============================================================

  findInteractTarget() {
    const range = 24;

    let closest = null;
    let closestDist = Infinity;

    for (const e of this.entities) {
      if (!e.interact) continue;

      const ex =
        e.x !== undefined
          ? e.x
          : e.spriteX;

      const ey =
        e.y !== undefined
          ? e.y
          : e.spriteY;

      const dist = Math.hypot(
        ex - this.player.x,
        ey - this.player.y
      );

      if (
        dist < range &&
        dist < closestDist
      ) {
        closest = e;
        closestDist = dist;
      }
    }

    return closest;
  },

  // ============================================================
  // Scene exits
  // ============================================================

  checkExits() {
    const box = {
      x: this.player.x - this.player.w / 2,
      y: this.player.y - this.player.h / 2,
      w: this.player.w,
      h: this.player.h,
    };

    for (const exit of this.currentScene.exits) {
      if (!rectsOverlap(box, exit.rect)) {
        continue;
      }

      if (
        exit.requiresFlag &&
        !this.flags[exit.requiresFlag]
      ) {
        if (
          performance.now() -
            this.lastBlockedToast >
          2000
        ) {
          this.showToast(
            "Something blocks the way — deal with the wolf first"
          );

          this.lastBlockedToast =
            performance.now();
        }

        continue;
      }

      this.loadScene(
        exit.target,
        exit.spawn
      );

      this.persistState();

      return;
    }
  },

  // ============================================================
  // Vision cutscene
  // ============================================================

  async playVision() {
    this.setPaused(true);

    const overlay =
      document.getElementById("visionOverlay");

    const textEl =
      document.getElementById("visionText");

    if (!overlay || !textEl) {
      this.setPaused(false);
      return;
    }

    overlay.style.display = "flex";

    await this._sleep(50);

    overlay.style.transition =
      "opacity 0.8s";

    overlay.style.opacity = "0.95";

    if (
      typeof AudioSys !== "undefined" &&
      AudioSys.setAmbient
    ) {
      AudioSys.setAmbient("mystery");
    }

    for (const line of CRYSTAL_VISION_TEXT) {
      textEl.textContent = line;

      textEl.style.transition =
        "opacity 0.6s";

      textEl.style.opacity = "1";

      await this._sleep(2600);

      textEl.style.opacity = "0";

      await this._sleep(600);
    }

    overlay.style.opacity = "0";

    await this._sleep(800);

    overlay.style.display = "none";

    this.setFlag(
      "visionSeen",
      true
    );

    if (
      typeof AudioSys !== "undefined" &&
      AudioSys.chime
    ) {
      AudioSys.chime();
    }

    if (
      typeof AudioSys !== "undefined" &&
      AudioSys.setAmbient
    ) {
      AudioSys.setAmbient(
        this.currentScene.ambient
      );
    }

    this.setPaused(false);

    this.showToast(
      "A vision lingers in your mind..."
    );
  },

  _sleep(ms) {
    return new Promise((res) =>
      setTimeout(res, ms)
    );
  },

  // ============================================================
  // HUD
  // ============================================================

  updateHUD() {
    const heartsEl =
      document.getElementById("hearts");

    if (!heartsEl || !this.player) {
      return;
    }

    heartsEl.innerHTML = "";

    const totalHearts =
      this.player.maxHp / 2;

    for (
      let i = 0;
      i < totalHearts;
      i++
    ) {
      const heartHp =
        this.player.hp - i * 2;

      const div =
        document.createElement("div");

      div.className =
        "heart" +
        (
          heartHp >= 2
            ? ""
            : heartHp === 1
              ? " half"
              : " empty"
        );

      heartsEl.appendChild(div);
    }

    const stageLabel =
      document.getElementById("stageLabel");

    if (stageLabel) {
      stageLabel.textContent =
        this.player.stage.toUpperCase();
    }
  },

  // ============================================================
  // TEXTURED GROUND
  // ============================================================

  renderGround() {
    const ctx = this.ctx;

    if (!this.currentGroundGrid) {
      return;
    }

    const grid =
      this.currentGroundGrid;

    for (
      let y = 0;
      y < grid.length;
      y++
    ) {
      for (
        let x = 0;
        x < grid[y].length;
        x++
      ) {
        const tile =
          grid[y][x];

        const px = x * TILE;
        const py = y * TILE;

        // ------------------------------------------------------
        // Grass
        // ------------------------------------------------------

        if (tile === GROUND.GRASS) {
          const r =
            Math.sin(
              x * 12.9898 +
              y * 78.233
            ) *
            43758.5453;

          const rand =
            r - Math.floor(r);

          ctx.fillStyle =
            "#2d542f";

          ctx.fillRect(
            px,
            py,
            TILE,
            TILE
          );

          ctx.fillStyle =
            rand > 0.5
              ? "#37663a"
              : "#244526";

          ctx.fillRect(
            px + Math.floor(rand * 10),
            py + Math.floor(rand * 8),
            2,
            4
          );

          if (rand > 0.7) {
            ctx.fillStyle =
              "#467d4a";

            ctx.fillRect(
              px + Math.floor(rand * 6) + 2,
              py + Math.floor(rand * 6) + 2,
              2,
              2
            );
          }

          // Small flowers
          if (rand > 0.88) {
            const flowerColors = [
              "#e84a4a",
              "#f5cb42",
              "#ffffff",
            ];

            ctx.fillStyle =
              flowerColors[
                Math.floor(
                  rand * 10
                ) %
                flowerColors.length
              ];

            ctx.fillRect(
              px + 6,
              py + 6,
              3,
              3
            );

            ctx.fillStyle =
              "#223b23";

            ctx.fillRect(
              px + 7,
              py + 9,
              1,
              3
            );
          }
        }

        // ------------------------------------------------------
        // Flower ground
        // ------------------------------------------------------

        else if (
          tile === GROUND.FLOWER
        ) {
          ctx.fillStyle =
            "#37663a";

          ctx.fillRect(
            px,
            py,
            TILE,
            TILE
          );

          ctx.fillStyle =
            "#e8d84a";

          ctx.fillRect(
            px + 7,
            py + 7,
            2,
            2
          );

          ctx.fillStyle =
            "#467d4a";

          ctx.fillRect(
            px + 2,
            py + 4,
            2,
            4
          );
        }

        // ------------------------------------------------------
        // Dirt path
        // ------------------------------------------------------

        else if (
          tile === GROUND.PATH
        ) {
          ctx.fillStyle =
            "#a88958";

          ctx.fillRect(
            px,
            py,
            TILE,
            TILE
          );

          const rand =
            Math.abs(
              Math.sin(
                x * 12.9898 +
                y * 78.233
              )
            ) % 1;

          ctx.fillStyle =
            "#8a6d40";

          if (rand > 0.3) {
            ctx.fillRect(
              px + 2,
              py + 3,
              3,
              2
            );
          }

          if (rand > 0.6) {
            ctx.fillRect(
              px + 9,
              py + 10,
              4,
              3
            );
          }

          ctx.fillStyle =
            "#c2a36e";

          if (rand > 0.4) {
            ctx.fillRect(
              px + 6,
              py + 5,
              2,
              2
            );
          }
        }

        // ------------------------------------------------------
        // Water
        // ------------------------------------------------------

        else if (
          tile === GROUND.WATER
        ) {
          const wave =
            Math.sin(
              performance.now() / 350 +
              x +
              y
            ) * 2;

          ctx.fillStyle =
            "#2b5c8f";

          ctx.fillRect(
            px,
            py,
            TILE,
            TILE
          );

          ctx.fillStyle =
            "#437ebd";

          ctx.fillRect(
            px + wave,
            py + 4,
            8,
            2
          );

          ctx.fillRect(
            px + 4 - wave,
            py + 11,
            6,
            2
          );
        }
      }
    }
  },

  // ============================================================
  // TEXTURED DECORATIONS
  // ============================================================

  _drawDecoration(d) {
    const ctx = this.ctx;

    if (
      d.type === "tree" &&
      typeof Sprites !== "undefined"
    ) {
      Sprites.drawTree(
        ctx,
        d.x,
        d.y
      );
    }

    else if (
      d.type === "rock" &&
      typeof Sprites !== "undefined"
    ) {
      Sprites.drawRock(
        ctx,
        d.x,
        d.y
      );
    }

    else if (
      d.type === "house" &&
      typeof Sprites !== "undefined"
    ) {
      Sprites.drawHouse(
        ctx,
        d.x,
        d.y,
        d.w,
        d.h
      );
    }

    else if (
      d.type === "fence" &&
      typeof Sprites !== "undefined" &&
      Sprites.drawFence
    ) {
      Sprites.drawFence(
        ctx,
        d.x,
        d.y
      );
    }

    else if (
      d.type === "lantern" &&
      typeof Sprites !== "undefined" &&
      Sprites.drawLantern
    ) {
      Sprites.drawLantern(
        ctx,
        d.x,
        d.y
      );
    }

    else if (
      d.type === "dummy" &&
      typeof Sprites !== "undefined" &&
      Sprites.drawDummy
    ) {
      Sprites.drawDummy(
        ctx,
        d.x,
        d.y
      );
    }

    else if (
      d.type === "crystal" &&
      typeof Sprites !== "undefined" &&
      Sprites.drawCrystal
    ) {
      Sprites.drawCrystal(
        ctx,
        d.x,
        d.y,
        {
          glowPhase:
            performance.now() / 700,
          awakened:
            this.flags.visionSeen
        }
      );
    }
  },

  // ============================================================
  // LIGHTING
  // ============================================================

  renderLighting() {
    const ctx = this.ctx;

    ctx.save();

    ctx.fillStyle =
      "rgba(18,25,35,0.10)";

    ctx.fillRect(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    ctx.globalCompositeOperation =
      "lighter";

    const glow = (
      x,
      y,
      radius
    ) => {
      const g =
        ctx.createRadialGradient(
          x,
          y,
          2,
          x,
          y,
          radius
        );

      g.addColorStop(
        0,
        "rgba(245,203,66,0.32)"
      );

      g.addColorStop(
        1,
        "rgba(245,203,66,0)"
      );

      ctx.fillStyle = g;

      ctx.beginPath();

      ctx.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
      );

      ctx.fill();
    };

    glow(273, 183, 36);
    glow(353, 273, 36);

    glow(90, 140, 20);
    glow(130, 140, 20);
    glow(170, 140, 20);
    glow(210, 140, 20);

    ctx.restore();
  },

  // ============================================================
  // ATMOSPHERE
  // ============================================================

  renderAtmosphere() {
    const ctx = this.ctx;

    ctx.save();

    const vignette =
      ctx.createRadialGradient(
        this.canvas.width / 2,
        this.canvas.height / 2,
        180,
        this.canvas.width / 2,
        this.canvas.height / 2,
        380
      );

    vignette.addColorStop(
      0,
      "rgba(0,0,0,0)"
    );

    vignette.addColorStop(
      1,
      "rgba(10,18,12,0.38)"
    );

    ctx.fillStyle = vignette;

    ctx.fillRect(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    ctx.restore();
  },

  // ============================================================
  // RENDER
  // ============================================================

  render() {
    const ctx = this.ctx;
    const scene = this.currentScene;

    if (!ctx || !scene || !this.player) {
      return;
    }

    ctx.clearRect(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    // ----------------------------------------------------------
    // 1. Textured ground
    // ----------------------------------------------------------

    World.drawGround(this.ctx, {
  x: 0,
  y: 0,
  w: this.canvas.width,
  h: this.canvas.height
});

    // ----------------------------------------------------------
    // 2. Depth-sorted decorations + entities + player
    // ----------------------------------------------------------

    const drawables = [];

    for (const d of scene.decorations) {
      if (d.interactKey) continue;

      drawables.push({
        sortY:
          d.y + (d.h || 24),

        draw: () =>
          this._drawDecoration(d),
      });
    }

    for (const e of this.entities) {
      const ey =
        e.y !== undefined
          ? e.y
          : 0;

      drawables.push({
        sortY: ey + 20,

        draw: () =>
          e.draw(ctx),
      });
    }

    drawables.push({
      sortY: this.player.y,

      draw: () =>
        this.player.draw(ctx),
    });

    drawables.sort(
      (a, b) =>
        a.sortY - b.sortY
    );

    for (const d of drawables) {
      d.draw();
    }

    // ----------------------------------------------------------
    // 3. Lighting
    // ----------------------------------------------------------

    this.renderLighting();

    // ----------------------------------------------------------
    // 4. Atmospheric depth
    // ----------------------------------------------------------

    this.renderAtmosphere();
  },

  // ============================================================
  // MAIN LOOP
  // ============================================================

  loop(time) {
    const dt =
      Math.min(
        0.05,
        (time - this.lastTime) / 1000 || 0
      );

    this.lastTime = time;

    const input =
      Input.poll();

    if (!this.paused) {
      const bounds = {
        x: 0,
        y: 0,
        w:
          this.currentScene.cols *
          TILE,
        h:
          this.currentScene.rows *
          TILE,
      };

      // Player
      this.player.update(
        dt,
        input,
        this.solids,
        bounds
      );

      // Entities
      for (const e of this.entities) {
        if (
          e instanceof Wolf
        ) {
          e.update(
            dt,
            this.player,
            this.solids
          );
        }

        else if (
          e instanceof TrainingDummy
        ) {
          e.update(
            dt,
            this.player
          );
        }

        else {
          e.update(dt);
        }
      }

      // Scene transitions
      this.checkExits();

      // Interaction
      if (input.interactPressed) {
        const target =
          this.findInteractTarget();

        if (target) {
          target.interact(
            this.flags,
            (k, v) =>
              this.setFlag(k, v)
          );
        }
      }

      // Death / recovery
      if (this.player.hp <= 0) {
        this.player.hp =
          this.player.maxHp;

        this.player.x = 60;
        this.player.y = 130;

        this.loadScene(
          "greenvale",
          {
            x: 60,
            y: 130,
            dir: "down",
          }
        );

        this.showToast(
          "You stumble home to recover..."
        );
      }
    }

    // Toast timer
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;

      if (
        this.toastTimer <= 0
      ) {
        const toast =
          document.getElementById(
            "toast"
          );

        if (toast) {
          toast.style.opacity =
            "0";
        }
      }
    }

    // HUD
    this.updateHUD();

    // Draw
    this.render();

    // Continue loop
    requestAnimationFrame(
      (t) => this.loop(t)
    );
  },
};

// ============================================================
// COLLISION HELPERS
// ============================================================

function getDecorationSolidRect(d) {
  switch (d.type) {
    case "tree":
      return {
        x: d.x + 8,
        y: d.y + 18,
        w: 12,
        h: 14,
      };

    case "rock":
      return {
        x: d.x + 2,
        y: d.y + 4,
        w: 12,
        h: 10,
      };

    case "house":
      return {
        x: d.x,
        y: d.y + d.h * 0.35,
        w: d.w,
        h: d.h * 0.65,
      };

    case "dummy":
      return {
        x: d.x,
        y: d.y + 4,
        w: 16,
        h: 20,
      };

    case "sign":
      return {
        x: d.x - 6,
        y: d.y,
        w: 16,
        h: 16,
      };

    default:
      return {
        x: d.x,
        y: d.y,
        w: 16,
        h: 16,
      };
  }
}

// ============================================================
// START GAME
// ============================================================

window.addEventListener(
  "load",
  () => Game.init()
);
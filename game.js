// ============================================================
// GAME.JS — Greenvale gameplay + textured renderer
// Keeps original gameplay systems, mobile controls, saves,
// dialogue, combat, scenes and progression.
// Uses World.js + Sprites.js for textured visuals.
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

  // ============================================================
  // INIT
  // ============================================================

  async init() {
    this.canvas = document.getElementById("gameCanvas");

    if (!this.canvas) {
      console.error("Game canvas not found");
      return;
    }

    this.ctx = this.canvas.getContext("2d");

    // Crisp pixel art
    this.ctx.imageSmoothingEnabled = false;

    // IMPORTANT:
    // Keep the original input system so the mobile buttons
    // and joystick continue working.
    if (
      typeof Input !== "undefined" &&
      Input.init
    ) {
      Input.init();
    }

    // IMPORTANT:
    // Initialize the textured World renderer.
    if (
      typeof World !== "undefined" &&
      World.init
    ) {
      World.init();
    }

    // Player
    this.player = new Player(60, 130);

    // UI buttons
    this._bindUI();

    // Audio
    if (
      typeof AudioSys !== "undefined" &&
      AudioSys.init
    ) {
      AudioSys.init();
    }

    // ----------------------------------------------------------
    // LOAD SAVE
    // ----------------------------------------------------------

    let save = null;

    if (
      typeof Storage !== "undefined" &&
      Storage.load
    ) {
      save = await Storage.load("ww-save");
    }

    if (save) {
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
          x:
            save.playerX != null
              ? save.playerX
              : 60,

          y:
            save.playerY != null
              ? save.playerY
              : 130,

          dir:
            save.playerDir || "down",
        }
      );

      this.showToast(
        "Welcome back to Whispering Woods"
      );
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
        this.showToast(
          "Use the joystick / arrow keys to move"
        );
      }, 600);
    }

    // ----------------------------------------------------------
    // DIALOGUE
    // ----------------------------------------------------------

    const dialogueBox =
      document.getElementById("dialogueBox");

    if (dialogueBox) {
      dialogueBox.addEventListener(
        "click",
        () => {
          if (
            typeof DialogueSys !== "undefined" &&
            DialogueSys.advance
          ) {
            DialogueSys.advance();
          }
        }
      );
    }

    // ----------------------------------------------------------
    // RESUME AUDIO AFTER USER INTERACTION
    // ----------------------------------------------------------

    document.body.addEventListener(
      "touchstart",
      () => {
        if (
          typeof AudioSys !== "undefined" &&
          AudioSys.resume
        ) {
          AudioSys.resume();
        }
      },
      { once: true }
    );

    document.body.addEventListener(
      "mousedown",
      () => {
        if (
          typeof AudioSys !== "undefined" &&
          AudioSys.resume
        ) {
          AudioSys.resume();
        }
      },
      { once: true }
    );

    // Start game loop
    requestAnimationFrame(
      (t) => this.loop(t)
    );
  },

  // ============================================================
  // UI
  // ============================================================

  _bindUI() {
    const pauseBtn =
      document.getElementById("pauseBtn");

    const resumeBtn =
      document.getElementById("resumeBtn");

    const saveBtn =
      document.getElementById("saveBtn");

    const loadBtn =
      document.getElementById("loadBtn");

    const restartBtn =
      document.getElementById("restartBtn");

    if (pauseBtn) {
      pauseBtn.onclick = () =>
        this.togglePause();
    }

    if (resumeBtn) {
      resumeBtn.onclick = () =>
        this.togglePause();
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
          this.showToast(
            "Save system unavailable"
          );
          return;
        }

        const save =
          await Storage.load("ww-save");

        if (!save) {
          this.showToast("No save found");
          return;
        }

        this.flags =
          save.flags || {};

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
            x:
              save.playerX != null
                ? save.playerX
                : 60,

            y:
              save.playerY != null
                ? save.playerY
                : 130,

            dir:
              save.playerDir || "down",
          }
        );

        const menu =
          document.getElementById(
            "pauseMenu"
          );

        if (menu) {
          menu.style.display = "none";
        }

        this.paused = false;

        this.showToast("Game loaded");
      };
    }

    if (restartBtn) {
      restartBtn.onclick = () => {
        this.flags = {};

        this.player.stage =
          "child";

        this.player.maxHp =
          STAGE_MAXHP.child;

        this.player.hp =
          this.player.maxHp;

        this.loadScene(
          "greenvale",
          {
            x: 60,
            y: 130,
            dir: "down",
          }
        );

        const menu =
          document.getElementById(
            "pauseMenu"
          );

        if (menu) {
          menu.style.display = "none";
        }

        this.paused = false;

        this.showToast(
          "Slice restarted"
        );
      };
    }
  },

  // ============================================================
  // PAUSE
  // ============================================================

  togglePause() {
    if (
      typeof DialogueSys !== "undefined" &&
      DialogueSys.active
    ) {
      return;
    }

    this.paused =
      !this.paused;

    const menu =
      document.getElementById(
        "pauseMenu"
      );

    if (menu) {
      menu.style.display =
        this.paused
          ? "flex"
          : "none";
    }
  },

  setPaused(v) {
    this.paused = v;
  },

  // ============================================================
  // FLAGS
  // ============================================================

  setFlag(key, value) {
    this.flags[key] = value;
    this.persistState();
  },

  // ============================================================
  // SAVE
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

    await Storage.save(
      "ww-save",
      {
        flags: this.flags,

        sceneId:
          this.currentScene.id,

        playerX:
          this.player.x,

        playerY:
          this.player.y,

        playerDir:
          this.player.dir,

        hp:
          this.player.hp,

        maxHp:
          this.player.maxHp,

        stage:
          this.player.stage,
      }
    );
  },

  // ============================================================
  // TOAST
  // ============================================================

  showToast(
    text,
    duration = 2.4
  ) {
    const el =
      document.getElementById(
        "toast"
      );

    if (!el) return;

    el.textContent = text;
    el.style.opacity = "1";

    this.toastTimer =
      duration;
  },

  // ============================================================
  // SCENE LOADING
  // ============================================================

  loadScene(id, spawn) {
    const def =
      SCENES[id];

    if (!def) {
      console.error(
        "Unknown scene:",
        id
      );
      return;
    }

    if (!def._pruned) {
      pruneExitBlockers(def);
      def._pruned = true;
    }

    this.currentScene =
      def;

    // Keep original gameplay grid.
    this.currentGroundGrid =
      def.build();

    // ----------------------------------------------------------
    // Canvas dimensions
    // ----------------------------------------------------------

    this.canvas.width =
      def.cols * TILE;

    this.canvas.height =
      def.rows * TILE;

    // ----------------------------------------------------------
    // Collision solids
    // ----------------------------------------------------------

    this.solids =
      def.decorations
        .filter(
          (d) => d.solid
        )
        .map(
          getDecorationSolidRect
        );

    // ----------------------------------------------------------
    // Interactables
    // ----------------------------------------------------------

    const interactables =
      def.decorations
        .filter(
          (d) => d.interactKey
        )
        .map((d) => {
          if (
            d.type === "dummy"
          ) {
            return new TrainingDummy(d);
          }

          return new Interactable(d);
        });

    // ----------------------------------------------------------
    // NPCs / ENEMIES
    // ----------------------------------------------------------

    const npcEntities =
      def.npcs.map(
        (n) => makeEntity(n)
      );

    this.entities = [
      ...interactables,
      ...npcEntities,
    ];

    // ----------------------------------------------------------
    // PLAYER
    // ----------------------------------------------------------

    this.player.x =
      spawn.x;

    this.player.y =
      spawn.y;

    if (spawn.dir) {
      this.player.dir =
        spawn.dir;
    }

    // ----------------------------------------------------------
    // AUDIO
    // ----------------------------------------------------------

    if (
      typeof AudioSys !== "undefined" &&
      AudioSys.setAmbient
    ) {
      AudioSys.setAmbient(
        def.ambient
      );
    }

    // ----------------------------------------------------------
    // LOCATION LABEL
    // ----------------------------------------------------------

    const locationLabel =
      document.getElementById(
        "locationLabel"
      );

    if (locationLabel) {
      locationLabel.textContent =
        def.name.toUpperCase();
    }
  },

  // ============================================================
  // INTERACTION
  // ============================================================

  findInteractTarget() {
    const range = 24;

    let closest = null;
    let closestDist =
      Infinity;

    for (const e of this.entities) {
      if (!e.interact) {
        continue;
      }

      const ex =
        e.x !== undefined
          ? e.x
          : e.spriteX;

      const ey =
        e.y !== undefined
          ? e.y
          : e.spriteY;

      const dist =
        Math.hypot(
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
  // SCENE EXITS
  // ============================================================

  checkExits() {
    const box = {
      x:
        this.player.x -
        this.player.w / 2,

      y:
        this.player.y -
        this.player.h / 2,

      w:
        this.player.w,

      h:
        this.player.h,
    };

    for (
      const exit
      of this.currentScene.exits
    ) {
      if (
        !rectsOverlap(
          box,
          exit.rect
        )
      ) {
        continue;
      }

      if (
        exit.requiresFlag &&
        !this.flags[
          exit.requiresFlag
        ]
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
  // VISION CUTSCENE
  // ============================================================

  async playVision() {
    this.setPaused(true);

    const overlay =
      document.getElementById(
        "visionOverlay"
      );

    const textEl =
      document.getElementById(
        "visionText"
      );

    if (
      !overlay ||
      !textEl
    ) {
      this.setPaused(false);
      return;
    }

    overlay.style.display =
      "flex";

    await this._sleep(50);

    overlay.style.transition =
      "opacity 0.8s";

    overlay.style.opacity =
      "0.95";

    if (
      typeof AudioSys !== "undefined" &&
      AudioSys.setAmbient
    ) {
      AudioSys.setAmbient(
        "mystery"
      );
    }

    for (
      const line
      of CRYSTAL_VISION_TEXT
    ) {
      textEl.textContent =
        line;

      textEl.style.transition =
        "opacity 0.6s";

      textEl.style.opacity =
        "1";

      await this._sleep(
        2600
      );

      textEl.style.opacity =
        "0";

      await this._sleep(
        600
      );
    }

    overlay.style.opacity =
      "0";

    await this._sleep(
      800
    );

    overlay.style.display =
      "none";

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
    return new Promise(
      (res) =>
        setTimeout(res, ms)
    );
  },

  // ============================================================
  // HUD
  // ============================================================

  updateHUD() {
    const heartsEl =
      document.getElementById(
        "hearts"
      );

    if (
      !heartsEl ||
      !this.player
    ) {
      return;
    }

    heartsEl.innerHTML =
      "";

    const totalHearts =
      this.player.maxHp / 2;

    for (
      let i = 0;
      i < totalHearts;
      i++
    ) {
      const heartHp =
        this.player.hp -
        i * 2;

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "heart" +
        (
          heartHp >= 2
            ? ""
            : heartHp === 1
              ? " half"
              : " empty"
        );

      heartsEl.appendChild(
        div
      );
    }

    const stageLabel =
      document.getElementById(
        "stageLabel"
      );

    if (stageLabel) {
      stageLabel.textContent =
        this.player.stage.toUpperCase();
    }
  },

  // ============================================================
  // TEXTURED GROUND
  // ============================================================
  //
  // IMPORTANT:
  // World.js owns the textured ground.
  //
  // We DO NOT call both renderGround() and
  // World.drawGround(), because that would draw the
  // ground twice.
  // ============================================================

  renderGround() {
    if (
      typeof World !== "undefined" &&
      World.drawGround
    ) {
      World.drawGround(
        this.ctx,
        {
          x: 0,
          y: 0,
          w: this.canvas.width,
          h: this.canvas.height,
        }
      );

      return;
    }

    // Fallback to the original ground renderer
    // if World.js is unavailable.
    const ctx =
      this.ctx;

    const grid =
      this.currentGroundGrid;

    if (!grid) {
      return;
    }

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

        const px =
          x * TILE;

        const py =
          y * TILE;

        if (
          tile === GROUND.GRASS
        ) {
          ctx.fillStyle =
            "#2d542f";

          ctx.fillRect(
            px,
            py,
            TILE,
            TILE
          );
        }

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
        }

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
        }

        else if (
          tile === GROUND.WATER
        ) {
          ctx.fillStyle =
            "#2b5c8f";

          ctx.fillRect(
            px,
            py,
            TILE,
            TILE
          );
        }
      }
    }
  },

  // ============================================================
  // TEXTURED DECORATIONS
  // ============================================================

  _drawDecoration(d) {
    if (
      typeof Sprites === "undefined"
    ) {
      return;
    }

    const ctx =
      this.ctx;

    if (
      d.type === "tree" &&
      Sprites.drawTree
    ) {
      Sprites.drawTree(
        ctx,
        d.x,
        d.y
      );
    }

    else if (
      d.type === "rock" &&
      Sprites.drawRock
    ) {
      Sprites.drawRock(
        ctx,
        d.x,
        d.y
      );
    }

    else if (
      d.type === "house" &&
      Sprites.drawHouse
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
            !!this.flags.visionSeen,
        }
      );
    }
  },

  // ============================================================
  // LIGHTING
  // ============================================================

  renderLighting() {
    const ctx =
      this.ctx;

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

      ctx.fillStyle =
        g;

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

    // Lanterns
    glow(
      273,
      183,
      36
    );

    glow(
      353,
      273,
      36
    );

    // Cottage windows
    glow(
      90,
      140,
      20
    );

    glow(
      130,
      140,
      20
    );

    glow(
      170,
      140,
      20
    );

    glow(
      210,
      140,
      20
    );

    ctx.restore();
  },

  // ============================================================
  // ATMOSPHERE
  // ============================================================

  renderAtmosphere() {
    const ctx =
      this.ctx;

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

    ctx.fillStyle =
      vignette;

    ctx.fillRect(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    ctx.restore();
  },

  // ============================================================
  // MAIN RENDER
  // ============================================================

  render() {
    const ctx =
      this.ctx;

    if (
      !ctx ||
      !this.currentScene ||
      !this.player
    ) {
      return;
    }

    ctx.clearRect(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    // ----------------------------------------------------------
    // 1. TEXTURED GROUND
    // ----------------------------------------------------------

    this.renderGround();

    // ----------------------------------------------------------
    // 2. DEPTH-SORTED DECORATIONS
    // ----------------------------------------------------------

    const drawables = [];

    for (
      const d
      of this.currentScene.decorations
    ) {
      // Interactive objects are represented by their
      // entity instead, so don't draw them twice.
      if (d.interactKey) {
        continue;
      }

      drawables.push({
        sortY:
          d.y +
          (d.h || 24),

        draw: () =>
          this._drawDecoration(d),
      });
    }

    // ----------------------------------------------------------
    // 3. ENTITIES
    // ----------------------------------------------------------

    for (
      const e
      of this.entities
    ) {
      const ey =
        e.y !== undefined
          ? e.y
          : 0;

      drawables.push({
        sortY:
          ey + 20,

        draw: () => {
          if (e.draw) {
            e.draw(ctx);
          }
        },
      });
    }

    // ----------------------------------------------------------
    // 4. PLAYER
    // ----------------------------------------------------------

    drawables.push({
      sortY:
        this.player.y,

      draw: () => {
        if (
          this.player.draw
        ) {
          this.player.draw(
            ctx
          );
        }
      },
    });

    // Sort from back to front.
    drawables.sort(
      (a, b) =>
        a.sortY -
        b.sortY
    );

    for (
      const d
      of drawables
    ) {
      d.draw();
    }

    // ----------------------------------------------------------
    // 5. LIGHTING
    // ----------------------------------------------------------

    this.renderLighting();

    // ----------------------------------------------------------
    // 6. ATMOSPHERE
    // ----------------------------------------------------------

    this.renderAtmosphere();

    // ----------------------------------------------------------
    // 7. HUD
    // ----------------------------------------------------------

    this.updateHUD();
  },

  // ============================================================
  // UPDATE
  // ============================================================

  update(dt) {
    if (this.paused) {
      return;
    }

    // World animation
    if (
      typeof World !== "undefined" &&
      World.update
    ) {
      World.update(dt);
    }

    // Player
    if (
      this.player &&
      this.player.update
    ) {
      this.player.update(
        dt,
        this
      );
    }

    // Entities
    for (
      const e
      of this.entities
    ) {
      if (
        e.update
      ) {
        e.update(
          dt,
          this
        );
      }
    }

    // Scene exits
    if (
      this.currentScene
    ) {
      this.checkExits();
    }

    // Toast timer
    if (
      this.toastTimer > 0
    ) {
      this.toastTimer -=
        dt;

      if (
        this.toastTimer <= 0
      ) {
        const el =
          document.getElementById(
            "toast"
          );

        if (el) {
          el.style.opacity =
            "0";
        }
      }
    }
  },

  // ============================================================
  // MAIN LOOP
  // ============================================================

  loop(timestamp) {
    const dt =
      Math.min(
        (
          timestamp -
          (this.lastTime || timestamp)
        ) / 1000,
        0.1
      );

    this.lastTime =
      timestamp;

    this.update(dt);

    this.render();

    requestAnimationFrame(
      (t) =>
        this.loop(t)
    );
  },
};

// ============================================================
// START GAME
// ============================================================

window.addEventListener(
  "load",
  () => {
    Game.init();
  }
);
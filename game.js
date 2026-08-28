// ============================================================
// GAME.JS — Main engine: scene loading, game loop, rendering,
// save/load, story flags, pause menu, vision cutscene.
//
// This is intentionally the only file that knows about "the
// whole game" — scenes, entities, dialogue, and sprites are all
// self-contained modules it wires together. That separation is
// what will make it possible to bolt on multiplayer later
// (see MULTIPLAYER-NOTES.md) without rewriting this file.
// ============================================================

const Game = {
  canvas: null, ctx: null,
  player: null,
  currentScene: null,
  entities: [],
  solids: [],
  flags: {},
  paused: false,
  lastTime: 0,
  lastBlockedToast: 0,
  toastTimer: 0,

  async init() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;

    this.player = new Player(60, 130);

    Input.init();
    this._bindUI();

    const save = await Storage.load("ww-save");
    if (save) {
      this.flags = save.flags || {};
      this.player.stage = save.stage || "child";
      this.player.maxHp = save.maxHp || STAGE_MAXHP.child;
      this.player.hp = save.hp != null ? save.hp : this.player.maxHp;
      this.loadScene(save.sceneId || "greenvale", { x: save.playerX || 60, y: save.playerY || 130, dir: save.playerDir || "down" });
      this.showToast("Welcome back to Whispering Woods");
    } else {
      this.loadScene("greenvale", { x: 60, y: 130, dir: "down" });
      setTimeout(() => this.showToast("Use the joystick / arrow keys to move"), 600);
    }

    document.getElementById("dialogueBox").addEventListener("click", () => DialogueSys.advance());
    document.body.addEventListener("touchstart", () => AudioSys.resume(), { once: true });
    document.body.addEventListener("mousedown", () => AudioSys.resume(), { once: true });
    AudioSys.init();

    requestAnimationFrame((t) => this.loop(t));
  },

  _bindUI() {
    document.getElementById("pauseBtn").onclick = () => this.togglePause();
    document.getElementById("resumeBtn").onclick = () => this.togglePause();
    document.getElementById("saveBtn").onclick = async () => {
      await this.persistState();
      this.showToast("Game saved");
    };
    document.getElementById("loadBtn").onclick = async () => {
      const save = await Storage.load("ww-save");
      if (!save) { this.showToast("No save found"); return; }
      this.flags = save.flags || {};
      this.player.stage = save.stage || "child";
      this.player.maxHp = save.maxHp || STAGE_MAXHP.child;
      this.player.hp = save.hp != null ? save.hp : this.player.maxHp;
      this.loadScene(save.sceneId || "greenvale", { x: save.playerX || 60, y: save.playerY || 130, dir: save.playerDir || "down" });
      document.getElementById("pauseMenu").style.display = "none";
      this.paused = false;
      this.showToast("Game loaded");
    };
    document.getElementById("restartBtn").onclick = () => {
      this.flags = {};
      this.player.stage = "child";
      this.player.maxHp = STAGE_MAXHP.child;
      this.player.hp = this.player.maxHp;
      this.loadScene("greenvale", { x: 60, y: 130, dir: "down" });
      document.getElementById("pauseMenu").style.display = "none";
      this.paused = false;
      this.showToast("Slice restarted");
    };
  },

  togglePause() {
    if (DialogueSys.active) return;
    this.paused = !this.paused;
    document.getElementById("pauseMenu").style.display = this.paused ? "flex" : "none";
  },

  setPaused(v) { this.paused = v; },

  setFlag(key, value) {
    this.flags[key] = value;
    this.persistState();
  },

  async persistState() {
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

  showToast(text, duration = 2.4) {
    const el = document.getElementById("toast");
    el.textContent = text;
    el.style.opacity = "1";
    this.toastTimer = duration;
  },

  loadScene(id, spawn) {
    const def = SCENES[id];
    if (!def) return;

    if (!def._pruned) {
      pruneExitBlockers(def);
      def._pruned = true;
    }

    this.currentScene = def;
    this.currentGroundGrid = def.build();

    this.canvas.width = def.cols * TILE;
    this.canvas.height = def.rows * TILE;

    this.solids = def.decorations.filter((d) => d.solid).map(getDecorationSolidRect);

    const interactables = def.decorations
      .filter((d) => d.interactKey)
      .map((d) => (d.type === "dummy" ? new TrainingDummy(d) : new Interactable(d)));
    const npcEntities = def.npcs.map((n) => makeEntity(n));
    this.entities = [...interactables, ...npcEntities];

    this.player.x = spawn.x;
    this.player.y = spawn.y;
    if (spawn.dir) this.player.dir = spawn.dir;

    AudioSys.setAmbient(def.ambient);
    document.getElementById("locationLabel").textContent = def.name.toUpperCase();
  },

  findInteractTarget() {
    const range = 24;
    let closest = null, closestDist = Infinity;
    for (const e of this.entities) {
      if (!e.interact) continue;
      const ex = e.x !== undefined ? e.x : e.spriteX;
      const ey = e.y !== undefined ? e.y : e.spriteY;
      const dist = Math.hypot(ex - this.player.x, ey - this.player.y);
      if (dist < range && dist < closestDist) { closest = e; closestDist = dist; }
    }
    return closest;
  },

  checkExits() {
    const box = { x: this.player.x - this.player.w / 2, y: this.player.y - this.player.h / 2, w: this.player.w, h: this.player.h };
    for (const exit of this.currentScene.exits) {
      if (!rectsOverlap(box, exit.rect)) continue;
      if (exit.requiresFlag && !this.flags[exit.requiresFlag]) {
        if (performance.now() - this.lastBlockedToast > 2000) {
          this.showToast("Something blocks the way — deal with the wolf first");
          this.lastBlockedToast = performance.now();
        }
        continue;
      }
      this.loadScene(exit.target, exit.spawn);
      this.persistState();
      return;
    }
  },

  async playVision() {
    this.setPaused(true);
    const overlay = document.getElementById("visionOverlay");
    const textEl = document.getElementById("visionText");
    overlay.style.display = "flex";
    await this._sleep(50);
    overlay.style.transition = "opacity 0.8s";
    overlay.style.opacity = "0.95";
    AudioSys.setAmbient("mystery");

    for (const line of CRYSTAL_VISION_TEXT) {
      textEl.textContent = line;
      textEl.style.transition = "opacity 0.6s";
      textEl.style.opacity = "1";
      await this._sleep(2600);
      textEl.style.opacity = "0";
      await this._sleep(600);
    }

    overlay.style.opacity = "0";
    await this._sleep(800);
    overlay.style.display = "none";
    this.setFlag("visionSeen", true);
    AudioSys.chime();
    AudioSys.setAmbient(this.currentScene.ambient);
    this.setPaused(false);
    this.showToast("A vision lingers in your mind...");
  },

  _sleep(ms) { return new Promise((res) => setTimeout(res, ms)); },

  updateHUD() {
    const heartsEl = document.getElementById("hearts");
    heartsEl.innerHTML = "";
    const totalHearts = this.player.maxHp / 2;
    for (let i = 0; i < totalHearts; i++) {
      const heartHp = this.player.hp - i * 2;
      const div = document.createElement("div");
      div.className = "heart" + (heartHp >= 2 ? "" : heartHp === 1 ? " half" : " empty");
      heartsEl.appendChild(div);
    }
    document.getElementById("stageLabel").textContent = this.player.stage.toUpperCase();
  },

  render() {
    const ctx = this.ctx;
    const scene = this.currentScene;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Ground
    const tileColors = {
      [GROUND.GRASS]: "#3a5a3a",
      [GROUND.FLOWER]: "#43633f",
      [GROUND.PATH]: "#c9a876",
      [GROUND.WATER]: "#3a6b8a",
    };
    for (let y = 0; y < this.currentGroundGrid.length; y++) {
      for (let x = 0; x < this.currentGroundGrid[y].length; x++) {
        const tile = this.currentGroundGrid[y][x];
        ctx.fillStyle = tileColors[tile];
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        if (tile === GROUND.FLOWER) {
          ctx.fillStyle = "#e8d84a";
          ctx.fillRect(x * TILE + 7, y * TILE + 7, 2, 2);
        }
      }
    }

    // Depth-sorted decorations + entities + player
    const drawables = [];
    for (const d of scene.decorations) {
      if (d.interactKey) continue;
      drawables.push({ sortY: d.y + (d.h || 24), draw: () => this._drawDecoration(d) });
    }
    for (const e of this.entities) {
      const ey = e.y !== undefined ? e.y : 0;
      drawables.push({ sortY: ey + 20, draw: () => e.draw(ctx) });
    }
    drawables.push({ sortY: this.player.y, draw: () => this.player.draw(ctx) });
    drawables.sort((a, b) => a.sortY - b.sortY);
    drawables.forEach((d) => d.draw());
  },

  _drawDecoration(d) {
    const ctx = this.ctx;
    if (d.type === "tree") Sprites.drawTree(ctx, d.x, d.y);
    else if (d.type === "rock") Sprites.drawRock(ctx, d.x, d.y);
    else if (d.type === "house") Sprites.drawHouse(ctx, d.x, d.y, d.w, d.h);
  },

  loop(time) {
    const dt = Math.min(0.05, (time - this.lastTime) / 1000 || 0);
    this.lastTime = time;

    const input = Input.poll();

    if (!this.paused) {
      const bounds = { x: 0, y: 0, w: this.currentScene.cols * TILE, h: this.currentScene.rows * TILE };
      this.player.update(dt, input, this.solids, bounds);

      for (const e of this.entities) {
        if (e instanceof Wolf) e.update(dt, this.player, this.solids);
        else if (e instanceof TrainingDummy) e.update(dt, this.player);
        else e.update(dt);
      }

      this.checkExits();

      if (input.interactPressed) {
        const target = this.findInteractTarget();
        if (target) target.interact(this.flags, (k, v) => this.setFlag(k, v));
      }

      if (this.player.hp <= 0) {
        this.player.hp = this.player.maxHp;
        this.player.x = 60; this.player.y = 130;
        this.loadScene("greenvale", { x: 60, y: 130, dir: "down" });
        this.showToast("You stumble home to recover...");
      }
    }

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) document.getElementById("toast").style.opacity = "0";
    }

    this.updateHUD();
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  },
};

function getDecorationSolidRect(d) {
  switch (d.type) {
    case "tree": return { x: d.x + 8, y: d.y + 18, w: 12, h: 14 };
    case "rock": return { x: d.x + 2, y: d.y + 4, w: 12, h: 10 };
    case "house": return { x: d.x, y: d.y + d.h * 0.35, w: d.w, h: d.h * 0.65 };
    case "dummy": return { x: d.x, y: d.y + 4, w: 16, h: 20 };
    case "sign": return { x: d.x - 6, y: d.y, w: 16, h: 16 };
    default: return { x: d.x, y: d.y, w: 16, h: 16 };
  }
}

window.addEventListener("load", () => Game.init());

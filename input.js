// ============================================================
// INPUT.JS — Keyboard + touch input, unified into one state
// object the game loop reads each frame: { moveX, moveY,
// attackPressed, interactPressed }.
// ============================================================

const Input = {
  moveX: 0, moveY: 0,
  attackPressed: false,
  interactPressed: false,
  _keys: {},
  _joystickActive: false,
  _joystickId: null,
  _joystickCenter: { x: 0, y: 0 },

  init() {
    window.addEventListener("keydown", (e) => {
      this._keys[e.key.toLowerCase()] = true;
      if (e.key === " ") this.attackPressed = true;
      if (e.key.toLowerCase() === "e" || e.key === "Enter") this.interactPressed = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => {
      this._keys[e.key.toLowerCase()] = false;
    });

    this._setupTouch();
  },

  _setupTouch() {
    const isTouch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    if (isTouch) document.getElementById("touchControls").style.display = "block";

    const zone = document.getElementById("joystickZone");
    const thumb = document.getElementById("joystickThumb");
    const attackBtn = document.getElementById("attackBtn");
    const interactBtn = document.getElementById("interactBtn");

    const rect = () => zone.getBoundingClientRect();

    const startJoy = (id, x, y) => {
      this._joystickActive = true;
      this._joystickId = id;
      const r = rect();
      this._joystickCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      updateJoy(x, y);
    };
    const updateJoy = (x, y) => {
      const dx = x - this._joystickCenter.x;
      const dy = y - this._joystickCenter.y;
      const maxR = 40;
      const dist = Math.min(Math.hypot(dx, dy), maxR);
      const angle = Math.atan2(dy, dx);
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      thumb.style.left = 32 + tx + "px";
      thumb.style.top = 32 + ty + "px";
      this.moveX = dist > 6 ? Math.cos(angle) * Math.min(1, dist / maxR) : 0;
      this.moveY = dist > 6 ? Math.sin(angle) * Math.min(1, dist / maxR) : 0;
    };
    const endJoy = () => {
      this._joystickActive = false;
      this._joystickId = null;
      this.moveX = 0; this.moveY = 0;
      thumb.style.left = "32px"; thumb.style.top = "32px";
    };

    zone.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      startJoy(t.identifier, t.clientX, t.clientY);
    }, { passive: false });
    zone.addEventListener("touchmove", (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === this._joystickId) updateJoy(t.clientX, t.clientY);
      }
    }, { passive: false });
    zone.addEventListener("touchend", (e) => {
      e.preventDefault();
      endJoy();
    }, { passive: false });

    attackBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.attackPressed = true;
      AudioSys.resume();
    }, { passive: false });

    interactBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.interactPressed = true;
      AudioSys.resume();
    }, { passive: false });

    // Also allow mouse for desktop testing of touch buttons
    attackBtn.addEventListener("mousedown", () => { this.attackPressed = true; });
    interactBtn.addEventListener("mousedown", () => { this.interactPressed = true; });
  },

  poll() {
    let mx = 0, my = 0;
    if (this._keys["arrowleft"] || this._keys["a"]) mx -= 1;
    if (this._keys["arrowright"] || this._keys["d"]) mx += 1;
    if (this._keys["arrowup"] || this._keys["w"]) my -= 1;
    if (this._keys["arrowdown"] || this._keys["s"]) my += 1;

    if (!this._joystickActive) {
      this.moveX = mx;
      this.moveY = my;
    }

    const snapshot = {
      moveX: this.moveX,
      moveY: this.moveY,
      attackPressed: this.attackPressed,
      interactPressed: this.interactPressed,
    };
    // One-shot flags reset after being read
    this.attackPressed = false;
    this.interactPressed = false;
    return snapshot;
  },
};

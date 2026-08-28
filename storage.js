// ============================================================
// STORAGE.JS — Save/load abstraction
// Uses window.storage when available (Claude artifact sandbox),
// falls back to localStorage for standalone hosting (Netlify etc).
// This means the same save code works in both environments.
// ============================================================

const Storage = {
  async save(key, value) {
    try {
      if (window.storage && typeof window.storage.set === "function") {
        await window.storage.set(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
      return true;
    } catch (e) {
      console.warn("Save failed:", e);
      return false;
    }
  },

  async load(key) {
    try {
      if (window.storage && typeof window.storage.get === "function") {
        const res = await window.storage.get(key);
        return res && res.value ? JSON.parse(res.value) : null;
      } else {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : null;
      }
    } catch (e) {
      return null;
    }
  },
};

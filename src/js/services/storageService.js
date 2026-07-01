// =====================================================
// storageService.js
// Persists library metadata, highlights, notes, bookmarks
// and app settings using Capacitor Preferences (falls back
// to localStorage when running in a plain browser tab so
// the app is testable without a device/emulator).
// =====================================================

const KEYS = {
  LIBRARY: 'aurora.library.v1',      // array of book records
  HIGHLIGHTS: 'aurora.highlights.v1', // array of highlight records
  BOOKMARKS: 'aurora.bookmarks.v1',   // array of bookmark records
  SETTINGS: 'aurora.settings.v1',     // single settings object
};

const DEFAULT_SETTINGS = {
  theme: 'dark',        // light | sepia | dark | black
  accent: 'violet',     // violet | mint | ocean | sunset
  fontSize: 17,
  lineHeight: 1.7,
  pageStyle: 'scroll',  // scroll | paged
  margins: 'comfortable', // narrow | comfortable | wide
  keepScreenOn: true,
  scanOnLaunch: false,
};

let PreferencesPlugin = null;
async function getPrefs() {
  if (PreferencesPlugin) return PreferencesPlugin;
  try {
    const mod = await import('@capacitor/preferences');
    PreferencesPlugin = mod.Preferences;
  } catch (e) {
    PreferencesPlugin = null; // not running inside Capacitor
  }
  return PreferencesPlugin;
}

async function readJSON(key, fallback) {
  const prefs = await getPrefs();
  if (prefs) {
    const { value } = await prefs.get({ key });
    return value ? JSON.parse(value) : fallback;
  }
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

async function writeJSON(key, value) {
  const prefs = await getPrefs();
  const str = JSON.stringify(value);
  if (prefs) {
    await prefs.set({ key, value: str });
  } else {
    localStorage.setItem(key, str);
  }
}

export const storageService = {
  // ---------- Library ----------
  async getLibrary() {
    return readJSON(KEYS.LIBRARY, []);
  },
  async saveLibrary(list) {
    return writeJSON(KEYS.LIBRARY, list);
  },
  async upsertBook(book) {
    const list = await this.getLibrary();
    const idx = list.findIndex((b) => b.id === book.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...book };
    else list.unshift(book);
    await this.saveLibrary(list);
    return list;
  },
  async removeBook(id) {
    const list = (await this.getLibrary()).filter((b) => b.id !== id);
    await this.saveLibrary(list);
    return list;
  },
  async updateProgress(id, page, totalPages) {
    const list = await this.getLibrary();
    const book = list.find((b) => b.id === id);
    if (!book) return;
    book.lastPage = page;
    book.totalPages = totalPages;
    book.progress = totalPages ? Math.round((page / totalPages) * 100) : 0;
    book.lastOpenedAt = Date.now();
    await this.saveLibrary(list);
  },
  async toggleFavorite(id) {
    const list = await this.getLibrary();
    const book = list.find((b) => b.id === id);
    if (!book) return;
    book.favorite = !book.favorite;
    await this.saveLibrary(list);
    return book.favorite;
  },

  // ---------- Highlights ----------
  async getHighlights(bookId = null) {
    const all = await readJSON(KEYS.HIGHLIGHTS, []);
    return bookId ? all.filter((h) => h.bookId === bookId) : all;
  },
  async addHighlight(highlight) {
    const all = await readJSON(KEYS.HIGHLIGHTS, []);
    all.unshift({ id: `hl_${Date.now()}`, createdAt: Date.now(), ...highlight });
    await writeJSON(KEYS.HIGHLIGHTS, all);
    return all;
  },
  async removeHighlight(id) {
    const all = (await readJSON(KEYS.HIGHLIGHTS, [])).filter((h) => h.id !== id);
    await writeJSON(KEYS.HIGHLIGHTS, all);
    return all;
  },

  // ---------- Bookmarks ----------
  async getBookmarks(bookId = null) {
    const all = await readJSON(KEYS.BOOKMARKS, []);
    return bookId ? all.filter((b) => b.bookId === bookId) : all;
  },
  async toggleBookmark(bookId, page, label = '') {
    const all = await readJSON(KEYS.BOOKMARKS, []);
    const idx = all.findIndex((b) => b.bookId === bookId && b.page === page);
    if (idx >= 0) {
      all.splice(idx, 1);
      await writeJSON(KEYS.BOOKMARKS, all);
      return false;
    }
    all.unshift({ id: `bm_${Date.now()}`, bookId, page, label, createdAt: Date.now() });
    await writeJSON(KEYS.BOOKMARKS, all);
    return true;
  },

  // ---------- Settings ----------
  async getSettings() {
    const saved = await readJSON(KEYS.SETTINGS, {});
    return { ...DEFAULT_SETTINGS, ...saved };
  },
  async saveSettings(patch) {
    const current = await this.getSettings();
    const next = { ...current, ...patch };
    await writeJSON(KEYS.SETTINGS, next);
    return next;
  },
};

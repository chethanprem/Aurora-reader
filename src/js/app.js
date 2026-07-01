// =====================================================
// app.js — app bootstrap, screen router, and a single
// delegated click handler that dispatches on [data-action].
// Keeping all wiring here (rather than scattered addEventListener
// calls per screen) keeps navigation predictable as the app grows.
// =====================================================
import { storageService } from './services/storageService.js';
import { fileService } from './services/fileService.js';
import { pdfService } from './services/pdfService.js';
import { renderHome } from './screens/home.js';
import { renderLibrary, setLibraryFilter } from './screens/library.js';
import { renderNotes, setNotesTab } from './screens/notes.js';
import { renderSettings, toggleKeepScreenOn, toggleScanOnLaunch } from './screens/settings.js';
import { renderAppearanceSheet, applyAppearanceToReader } from './components/themePicker.js';
import * as Reader from './screens/reader.js';

// ---------------- Toast ----------------
let toastTimer = null;
export function showToast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ---------------- Screen router ----------------
const SCREENS = ['home', 'library', 'reader', 'notes', 'settings'];

async function showScreen(name) {
  if (name !== 'reader' && Reader.getState().book) {
    await Reader.closeBook();
  }
  SCREENS.forEach((s) => {
    document.getElementById(`screen-${s}`)?.classList.toggle('active', s === name);
  });
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.nav === name);
  });

  if (name === 'home') await renderHome();
  if (name === 'library') await renderLibrary();
  if (name === 'notes') await renderNotes();
  if (name === 'settings') await renderSettings();
}

// ---------------- Import flow ----------------
async function importBook() {
  try {
    const files = await fileService.pickFiles();
    if (!files || files.length === 0) return;

    for (const file of files) {
      const book = await fileService.importPickedFile(file);
      // Generate a cover thumbnail from page 1 so grid/list views look right.
      try {
        const bytes = await fileService.readBookBytes(book);
        const pdf = await pdfService.loadDocument(book.id, bytes);
        book.totalPages = pdf.numPages;
        book.coverDataUrl = await pdfService.generateCoverDataUrl(pdf);
        pdfService.unloadDocument(book.id);
      } catch (e) {
        console.warn('Cover generation failed', e);
      }
      await storageService.upsertBook(book);
    }
    showToast(files.length > 1 ? `Imported ${files.length} books` : 'Book imported');
    await renderLibrary();
    await renderHome();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Import failed');
  }
}

async function scanDevice() {
  try {
    showToast('Scanning device…');
    const found = await fileService.scanDeviceForPdfs();
    if (found.length === 0) return showToast('No new PDFs found.');
    showToast(`Found ${found.length} PDF${found.length > 1 ? 's' : ''} — importing…`);
    // Scanning returns descriptors only; user still confirms via the
    // normal import (picker) flow for files they want added, keeping
    // storage permission usage minimal and explicit.
  } catch (err) {
    showToast(err.message);
  }
}

// ---------------- Appearance sheet ----------------
async function openAppearance() {
  await renderAppearanceSheet();
  document.getElementById('appearance-sheet').classList.add('open');
}
function closeAppearance() {
  document.getElementById('appearance-sheet').classList.remove('open');
}

async function patchSettingsAndRefresh(patch) {
  await storageService.saveSettings(patch);
  await renderAppearanceSheet();
  await applyAppearanceToReader();
}

// ---------------- Global click delegation ----------------
document.addEventListener('click', async (e) => {
  const target = e.target.closest('[data-action]');
  const navBtn = e.target.closest('[data-nav]');

  if (navBtn) return showScreen(navBtn.dataset.nav);
  if (!target) return;

  const action = target.dataset.action;

  switch (action) {
    case 'import-book':
      return importBook();
    case 'scan-device':
      return scanDevice();
    case 'open-book':
      await showScreen('reader');
      return Reader.openBook(target.dataset.bookId);
    case 'reader-back':
      return showScreen('library');
    case 'toggle-thumbs':
      return Reader.toggleThumbRail();
    case 'toggle-bookmark':
      return Reader.toggleBookmark();
    case 'goto-page':
      return Reader.goToPage(parseInt(target.dataset.page, 10));
    case 'open-appearance':
      return openAppearance();
    case 'close-appearance':
      return closeAppearance();
    case 'font-toggle':
      return openAppearance();

    // Library filter chips
    default:
      break;
  }

  // Filter chips (data-filter, not data-action)
  const chip = e.target.closest('.chip[data-filter]');
  if (chip) return setLibraryFilter(chip.dataset.filter);

  // Notes tabs
  const tab = e.target.closest('.tab[data-tab]');
  if (tab) return setNotesTab(tab.dataset.tab);

  // Appearance sheet controls
  if (action === 'set-theme') return patchSettingsAndRefresh({ theme: target.dataset.value });
  if (action === 'set-accent') return patchSettingsAndRefresh({ accent: target.dataset.value });
  if (action === 'set-line-height') return patchSettingsAndRefresh({ lineHeight: parseFloat(target.dataset.value) });
  if (action === 'set-page-style') return patchSettingsAndRefresh({ pageStyle: target.dataset.value });
  if (action === 'set-margins') return patchSettingsAndRefresh({ margins: target.dataset.value });
  if (action === 'font-size') {
    const s = await storageService.getSettings();
    const next = Math.max(12, Math.min(28, s.fontSize + parseInt(target.dataset.delta, 10)));
    return patchSettingsAndRefresh({ fontSize: next });
  }

  // Settings screen toggles
  if (action === 'toggle-keep-screen-on') return toggleKeepScreenOn();
  if (action === 'toggle-scan-on-launch') return toggleScanOnLaunch();
});

document.getElementById('page-slider')?.addEventListener('input', (e) => {
  Reader.onSliderInput(e.target.value);
});

document.getElementById('appearance-sheet')?.addEventListener('click', (e) => {
  if (e.target.id === 'appearance-sheet') closeAppearance();
});

// ---------------- Boot ----------------
async function boot() {
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  } catch (e) {
    /* running outside Capacitor — fine */
  }
  await showScreen('home');
}

boot();

// =====================================================
// reader.js — the reading screen: page rendering, page
// navigation, thumbnail rail, text selection -> highlights,
// bookmarks, and reading-progress persistence.
// =====================================================
import { storageService } from '../services/storageService.js';
import { fileService } from '../services/fileService.js';
import { pdfService } from '../services/pdfService.js';
import { applyAppearanceToReader } from '../components/themePicker.js';
import { showToast } from '../app.js';

let state = {
  book: null,
  pdf: null,
  currentPage: 1,
  totalPages: 1,
  thumbsOpen: false,
};

const pageContainer = () => document.getElementById('reader-page-container');
const rail = () => document.getElementById('thumb-rail');

export async function openBook(bookId) {
  const library = await storageService.getLibrary();
  const book = library.find((b) => b.id === bookId);
  if (!book) return showToast('Book not found.');

  document.getElementById('reader-title').textContent = book.title || 'Untitled';

  try {
    const bytes = await fileService.readBookBytes(book);
    const pdf = await pdfService.loadDocument(book.id, bytes);
    state.book = book;
    state.pdf = pdf;
    state.totalPages = pdf.numPages;
    state.currentPage = Math.min(book.lastPage || 1, state.totalPages);

    document.getElementById('page-slider').max = state.totalPages;
    document.getElementById('page-slider').value = state.currentPage;

    await applyAppearanceToReader();
    await renderCurrentPage();
    buildThumbRail();
    updateBookmarkIcon();
  } catch (err) {
    console.error(err);
    showToast('Could not open this book.');
  }
}

export async function closeBook() {
  if (state.book) {
    await storageService.updateProgress(state.book.id, state.currentPage, state.totalPages);
  }
  state = { book: null, pdf: null, currentPage: 1, totalPages: 1, thumbsOpen: false };
}

async function renderCurrentPage() {
  const container = pageContainer();
  await pdfService.renderPage(state.pdf, state.currentPage, container);
  document.getElementById('page-indicator').textContent = `${state.currentPage} / ${state.totalPages}`;
  document.getElementById('page-slider').value = state.currentPage;
  highlightCurrentThumb();
  await storageService.updateProgress(state.book.id, state.currentPage, state.totalPages);
  attachSelectionHandling(container);
}

export async function goToPage(pageNumber) {
  const clamped = Math.max(1, Math.min(state.totalPages, pageNumber));
  if (clamped === state.currentPage) return;
  state.currentPage = clamped;
  await renderCurrentPage();
}

export function nextPage() { goToPage(state.currentPage + 1); }
export function prevPage() { goToPage(state.currentPage - 1); }

export function onSliderInput(value) {
  goToPage(parseInt(value, 10));
}

// ---------------- Thumbnail rail ----------------

function buildThumbRail() {
  const el = rail();
  el.innerHTML = '';
  for (let i = 1; i <= state.totalPages; i++) {
    const item = document.createElement('div');
    item.className = 'thumb-item';
    item.dataset.page = i;
    item.dataset.action = 'goto-page';
    item.innerHTML = `<canvas></canvas><span class="thumb-num">${i}</span>`;
    el.appendChild(item);
  }
  observeThumbs();
  highlightCurrentThumb();
}

let thumbObserver = null;
function observeThumbs() {
  if (thumbObserver) thumbObserver.disconnect();
  thumbObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const item = entry.target;
      const canvas = item.querySelector('canvas');
      if (canvas.dataset.rendered) return;
      canvas.dataset.rendered = '1';
      pdfService.renderThumbnail(state.pdf, parseInt(item.dataset.page, 10), canvas, 88);
    });
  }, { root: rail(), rootMargin: '200px 0px' });

  rail().querySelectorAll('.thumb-item').forEach((item) => thumbObserver.observe(item));
}

function highlightCurrentThumb() {
  rail().querySelectorAll('.thumb-item').forEach((item) => {
    item.classList.toggle('current', parseInt(item.dataset.page, 10) === state.currentPage);
  });
}

export function toggleThumbRail() {
  state.thumbsOpen = !state.thumbsOpen;
  rail().classList.toggle('open', state.thumbsOpen);
}

// ---------------- Bookmarks ----------------

export async function toggleBookmark() {
  if (!state.book) return;
  const isNowBookmarked = await storageService.toggleBookmark(state.book.id, state.currentPage);
  updateBookmarkIcon(isNowBookmarked);
  showToast(isNowBookmarked ? 'Bookmark added' : 'Bookmark removed');
}

async function updateBookmarkIcon(forced = null) {
  const btn = document.querySelector('[data-action="toggle-bookmark"]');
  if (!btn || !state.book) return;
  let marked = forced;
  if (marked === null) {
    const marks = await storageService.getBookmarks(state.book.id);
    marked = marks.some((m) => m.page === state.currentPage);
  }
  btn.textContent = marked ? '★' : '☆';
}

// ---------------- Text selection -> highlights ----------------

function attachSelectionHandling(container) {
  container.addEventListener('mouseup', handleSelectionEnd);
  container.addEventListener('touchend', handleSelectionEnd);
}

function handleSelectionEnd() {
  const selection = window.getSelection();
  const text = selection?.toString()?.trim();
  if (!text) return hidePopup();
  showSelectionPopup(selection, text);
}

function ensurePopup() {
  let popup = document.querySelector('.selection-popup');
  if (popup) return popup;
  popup = document.createElement('div');
  popup.className = 'selection-popup';
  popup.innerHTML = `
    <button class="swatch sw-yellow" data-color="yellow"></button>
    <button class="swatch sw-blue" data-color="blue"></button>
    <button class="swatch sw-green" data-color="green"></button>
    <button class="swatch sw-pink" data-color="pink"></button>
    <button class="swatch sw-note" data-color="note">✎</button>
  `;
  document.getElementById('reader-canvas-wrap').appendChild(popup);
  popup.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-color]');
    if (!btn) return;
    applyHighlight(btn.dataset.color);
  });
  return popup;
}

let pendingSelection = null;

function showSelectionPopup(selection, text) {
  const popup = ensurePopup();
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const wrapRect = document.getElementById('reader-canvas-wrap').getBoundingClientRect();

  popup.style.left = `${rect.left - wrapRect.left}px`;
  popup.style.top = `${rect.top - wrapRect.top - 46}px`;
  popup.classList.add('open');

  pendingSelection = { range: range.cloneRange(), text };
}

function hidePopup() {
  document.querySelector('.selection-popup')?.classList.remove('open');
  pendingSelection = null;
}

async function applyHighlight(color) {
  if (!pendingSelection) return;
  const { range, text } = pendingSelection;

  if (color !== 'note') {
    try {
      const mark = document.createElement('mark');
      mark.className = `hl hl-${color}`;
      range.surroundContents(mark);
    } catch (e) {
      // Selection spanned multiple text-layer spans; still save the
      // highlight record even if we can't visually wrap it perfectly.
    }
  }

  await storageService.addHighlight({
    bookId: state.book.id,
    bookTitle: state.book.title,
    page: state.currentPage,
    text,
    color: color === 'note' ? 'note' : color,
    note: '',
  });

  window.getSelection().removeAllRanges();
  hidePopup();
  showToast(color === 'note' ? 'Note added' : 'Highlight saved');
}

export function getState() {
  return state;
}

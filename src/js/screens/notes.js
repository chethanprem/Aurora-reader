// =====================================================
// notes.js — Highlights / Bookmarks / Notes tabs
// =====================================================
import { storageService } from '../services/storageService.js';

let activeTab = 'highlights';

export function setNotesTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-row .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  renderNotes();
}

export async function renderNotes() {
  const el = document.getElementById('notes-content');

  if (activeTab === 'highlights') {
    const highlights = (await storageService.getHighlights()).filter((h) => h.color !== 'note');
    el.innerHTML = highlights.length
      ? highlights.map(highlightCard).join('')
      : emptyState('✎', 'No highlights yet', 'Select text while reading to highlight it.');
    return;
  }

  if (activeTab === 'notes') {
    const notes = (await storageService.getHighlights()).filter((h) => h.color === 'note');
    el.innerHTML = notes.length
      ? notes.map(highlightCard).join('')
      : emptyState('✎', 'No notes yet', 'Select text and tap the note icon to add one.');
    return;
  }

  if (activeTab === 'bookmarks') {
    const marks = await storageService.getBookmarks();
    el.innerHTML = marks.length
      ? marks.map(bookmarkRow).join('')
      : emptyState('☆', 'No bookmarks yet', 'Tap the star in the reader to bookmark a page.');
    return;
  }
}

function highlightCard(h) {
  return `
    <div class="highlight-card hl-${h.color === 'note' ? 'blue' : h.color}" data-hl-id="${h.id}">
      <p>"${escapeHtml(h.text)}"</p>
      <div class="hl-meta">${escapeHtml(h.bookTitle || '')} · Page ${h.page}</div>
    </div>`;
}

function bookmarkRow(b) {
  return `
    <div class="highlight-card hl-yellow" data-bm-id="${b.id}">
      <p>${escapeHtml(b.label || 'Bookmark')}</p>
      <div class="hl-meta">Page ${b.page}</div>
    </div>`;
}

function emptyState(glyph, title, sub) {
  return `
    <div class="empty-state">
      <div class="glyph">${glyph}</div>
      <h3>${title}</h3>
      <p>${sub}</p>
    </div>`;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

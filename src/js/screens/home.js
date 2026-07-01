// =====================================================
// home.js — Home screen: "Continue Reading" + recent library
// =====================================================
import { storageService } from '../services/storageService.js';
import { gridCard } from '../components/bookCard.js';

export async function renderHome() {
  const el = document.getElementById('home-content');
  const library = await storageService.getLibrary();

  if (library.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="glyph">◆</div>
        <h3>Your library is empty</h3>
        <p>Import a PDF from your device to start reading.</p>
        <button class="cta" data-action="import-book">Import a book</button>
      </div>`;
    return;
  }

  const sorted = [...library].sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0));
  const continueBook = sorted.find((b) => (b.progress || 0) > 0 && (b.progress || 0) < 100) || sorted[0];
  const recent = sorted.slice(0, 6);

  el.innerHTML = `
    <div class="section-label">Continue Reading</div>
    ${continueCardHtml(continueBook)}

    <div class="section-label">Recent Books</div>
    <div class="book-grid">
      ${recent.map(gridCard).join('')}
    </div>
  `;
}

function continueCardHtml(book) {
  const cover = book.coverDataUrl
    ? `<img class="continue-cover" src="${book.coverDataUrl}" alt="" />`
    : `<div class="continue-cover"></div>`;
  return `
    <div class="continue-card" data-action="open-book" data-book-id="${book.id}">
      ${cover}
      <div class="continue-meta">
        <h4>${book.title || 'Untitled'}</h4>
        <p>${book.author || 'Unknown'}</p>
        <div class="progress-row">
          <div class="progress-track" style="flex:1"><div class="progress-fill" style="width:${book.progress || 0}%"></div></div>
          <div class="play-btn" data-action="open-book" data-book-id="${book.id}">▶</div>
        </div>
      </div>
    </div>`;
}

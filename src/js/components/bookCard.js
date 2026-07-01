// =====================================================
// bookCard.js
// Renders a book as a grid card (Home/Library grid view)
// or a list row (Library list view). Pure functions that
// return HTML strings — screens are responsible for wiring
// up click handlers via event delegation.
// =====================================================

export function gridCard(book) {
  const cover = book.coverDataUrl
    ? `<img src="${book.coverDataUrl}" alt="" />`
    : escapeHtml(book.title || 'Untitled');

  return `
    <div class="book-card" data-book-id="${book.id}" data-action="open-book">
      <div class="book-cover">
        ${cover}
        ${book.progress ? `<span class="book-progress-badge">${book.progress}%</span>` : ''}
      </div>
      <div class="book-title">${escapeHtml(book.title || 'Untitled')}</div>
      <div class="book-author">${escapeHtml(book.author || 'Unknown')}</div>
    </div>`;
}

export function listRow(book) {
  const cover = book.coverDataUrl
    ? `<img src="${book.coverDataUrl}" alt="" />`
    : escapeHtml((book.title || 'U')[0]);

  return `
    <div class="lib-list-item" data-book-id="${book.id}" data-action="open-book">
      <div class="book-cover">${cover}</div>
      <div class="lib-list-meta">
        <div class="book-title">${escapeHtml(book.title || 'Untitled')}</div>
        <div class="book-author">${escapeHtml(book.author || 'Unknown')} · ${book.format?.toUpperCase() || 'PDF'}</div>
        ${book.progress ? `<div class="lib-list-progress">${book.progress}% read</div>` : `<div class="lib-list-progress">Not started</div>`}
      </div>
      <button class="lib-list-more" data-action="book-menu" data-book-id="${book.id}">⋯</button>
    </div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

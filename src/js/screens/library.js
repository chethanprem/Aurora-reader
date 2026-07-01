// =====================================================
// library.js — full library with filter chips (All / PDF / Books / Favorites)
// =====================================================
import { storageService } from '../services/storageService.js';
import { listRow } from '../components/bookCard.js';

let currentFilter = 'all';

export function setLibraryFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('#lib-filters .chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.filter === filter);
  });
  renderLibrary();
}

export async function renderLibrary() {
  const el = document.getElementById('library-content');
  const all = await storageService.getLibrary();

  let list = all;
  if (currentFilter === 'pdf') list = all.filter((b) => b.format === 'pdf');
  if (currentFilter === 'epub') list = all.filter((b) => b.format === 'epub');
  if (currentFilter === 'favorite') list = all.filter((b) => b.favorite);

  if (list.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="glyph">▥</div>
        <h3>Nothing here yet</h3>
        <p>${currentFilter === 'favorite' ? 'Tap the star on a book to favorite it.' : 'Import PDFs from your device to build your library.'}</p>
        <button class="cta" data-action="import-book">Import a book</button>
      </div>`;
    return;
  }

  list.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  el.innerHTML = list.map(listRow).join('');
}

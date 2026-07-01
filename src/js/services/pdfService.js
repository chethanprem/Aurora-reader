// =====================================================
// pdfService.js
// Thin wrapper around pdf.js (loaded globally as window.pdfjsLib
// from index.html) — loading documents, rendering a page to a
// canvas + selectable text layer, and generating thumbnails.
// =====================================================

const docCache = new Map(); // bookId -> pdfjsLib document proxy

export const pdfService = {
  async loadDocument(bookId, bytes) {
    if (docCache.has(bookId)) return docCache.get(bookId);
    const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    docCache.set(bookId, pdf);
    return pdf;
  },

  unloadDocument(bookId) {
    docCache.delete(bookId);
  },

  async getPageCount(pdf) {
    return pdf.numPages;
  },

  /**
   * Renders a full-resolution page into `container` as a canvas
   * plus an overlaid, selectable text layer (needed for highlighting).
   */
  async renderPage(pdf, pageNumber, container, scale = 1.4) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-canvas-page';
    wrapper.style.width = `${viewport.width}px`;
    wrapper.style.height = `${viewport.height}px`;

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'textLayer';
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.height = `${viewport.height}px`;

    wrapper.appendChild(canvas);
    wrapper.appendChild(textLayerDiv);
    container.appendChild(wrapper);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const textContent = await page.getTextContent();
    window.pdfjsLib.renderTextLayer({
      textContentSource: textContent,
      container: textLayerDiv,
      viewport,
      textDivs: [],
    });

    return { page, viewport };
  },

  /** Renders a small thumbnail into a <canvas> for the page rail / cover art */
  async renderThumbnail(pdf, pageNumber, canvas, maxWidth = 90) {
    const page = await pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = maxWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas;
  },

  /** Generates a data URL cover image from page 1, used on Home/Library cards */
  async generateCoverDataUrl(pdf) {
    const canvas = document.createElement('canvas');
    await this.renderThumbnail(pdf, 1, canvas, 240);
    return canvas.toDataURL('image/jpeg', 0.85);
  },
};

// =====================================================
// themePicker.js
// Renders the Appearance bottom sheet (theme, accent, font size,
// line spacing, page style, margins) and applies changes live to
// the reader page container. Mirrors the "Appearance" panel from
// the design reference (Light / Sepia / Dark / Black themes).
// =====================================================
import { storageService } from '../services/storageService.js';

const THEMES = [
  { id: 'light', label: 'Light' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'dark', label: 'Dark' },
  { id: 'black', label: 'Black' },
];

const ACCENTS = [
  { id: 'violet', label: 'Violet' },
  { id: 'mint', label: 'Mint' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'sunset', label: 'Sunset' },
];

export async function renderAppearanceSheet() {
  const settings = await storageService.getSettings();
  const el = document.getElementById('appearance-body');

  el.innerHTML = `
    <div class="appearance-block">
      <div class="appearance-label">Theme</div>
      <div class="theme-swatch-row">
        ${THEMES.map((t) => `
          <div class="theme-swatch ts-${t.id} ${settings.theme === t.id ? 'selected' : ''}" data-action="set-theme" data-value="${t.id}">
            Aa<small>${t.label}</small>
          </div>`).join('')}
      </div>
    </div>

    <div class="appearance-block">
      <div class="appearance-label">Accent</div>
      <div class="segmented">
        ${ACCENTS.map((a) => `<button data-action="set-accent" data-value="${a.id}" class="${settings.accent === a.id ? 'active' : ''}">${a.label}</button>`).join('')}
      </div>
    </div>

    <div class="appearance-block">
      <div class="appearance-label">Font Size — ${settings.fontSize}px</div>
      <div class="stepper-row">
        <button class="stepper-btn" data-action="font-size" data-delta="-1">A-</button>
        <span>${settings.fontSize}</span>
        <button class="stepper-btn" data-action="font-size" data-delta="1">A+</button>
      </div>
    </div>

    <div class="appearance-block">
      <div class="appearance-label">Line Spacing</div>
      <div class="segmented">
        <button data-action="set-line-height" data-value="1.4" class="${settings.lineHeight === 1.4 ? 'active' : ''}">Tight</button>
        <button data-action="set-line-height" data-value="1.7" class="${settings.lineHeight === 1.7 ? 'active' : ''}">Normal</button>
        <button data-action="set-line-height" data-value="2.1" class="${settings.lineHeight === 2.1 ? 'active' : ''}">Loose</button>
      </div>
    </div>

    <div class="appearance-block">
      <div class="appearance-label">Page Style</div>
      <div class="segmented">
        <button data-action="set-page-style" data-value="scroll" class="${settings.pageStyle === 'scroll' ? 'active' : ''}">Scroll</button>
        <button data-action="set-page-style" data-value="paged" class="${settings.pageStyle === 'paged' ? 'active' : ''}">Paged</button>
      </div>
    </div>

    <div class="appearance-block">
      <div class="appearance-label">Margins</div>
      <div class="segmented">
        <button data-action="set-margins" data-value="narrow" class="${settings.margins === 'narrow' ? 'active' : ''}">Narrow</button>
        <button data-action="set-margins" data-value="comfortable" class="${settings.margins === 'comfortable' ? 'active' : ''}">Comfortable</button>
        <button data-action="set-margins" data-value="wide" class="${settings.margins === 'wide' ? 'active' : ''}">Wide</button>
      </div>
    </div>
  `;
}

/** Applies persisted appearance settings to the live reader DOM. */
export async function applyAppearanceToReader() {
  const settings = await storageService.getSettings();
  const container = document.getElementById('reader-page-container');
  if (!container) return;

  container.className = 'reader-page-container'; // reset
  container.classList.add(`page-theme-${settings.theme}`);
  document.body.classList.remove('accent-violet', 'accent-mint', 'accent-ocean', 'accent-sunset');
  document.body.classList.add(`accent-${settings.accent}`);

  container.style.setProperty('--reader-font-size', `${settings.fontSize}px`);
  container.style.setProperty('--reader-line-height', settings.lineHeight);

  const marginMap = { narrow: '12px', comfortable: '22px', wide: '40px' };
  container.style.paddingLeft = marginMap[settings.margins] || '22px';
  container.style.paddingRight = marginMap[settings.margins] || '22px';
}

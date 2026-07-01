// =====================================================
// settings.js — app-level settings (separate from per-book
// Appearance sheet, though it edits the same settings store
// so defaults for new reading sessions stay in sync).
// =====================================================
import { storageService } from '../services/storageService.js';

export async function renderSettings() {
  const s = await storageService.getSettings();
  const el = document.getElementById('settings-content');

  el.innerHTML = `
    <div class="settings-group">
      <div class="section-label">Reading Defaults</div>
      <div class="settings-row">
        <div>Default theme<div class="row-sub">Used when opening a new book</div></div>
        <div>${capitalize(s.theme)}</div>
      </div>
      <div class="settings-row">
        <div>Page style</div>
        <div>${capitalize(s.pageStyle)}</div>
      </div>
    </div>

    <div class="settings-group">
      <div class="section-label">Behavior</div>
      <div class="settings-row">
        <div>Keep screen on while reading</div>
        <button class="switch ${s.keepScreenOn ? 'on' : ''}" data-action="toggle-keep-screen-on"></button>
      </div>
      <div class="settings-row">
        <div>Scan device for PDFs on launch<div class="row-sub">Looks in Documents &amp; Downloads</div></div>
        <button class="switch ${s.scanOnLaunch ? 'on' : ''}" data-action="toggle-scan-on-launch"></button>
      </div>
    </div>

    <div class="settings-group">
      <div class="section-label">Library</div>
      <div class="settings-row" data-action="scan-device">
        <div>Scan device storage now<div class="row-sub">Find PDFs already on your phone</div></div>
        <div>›</div>
      </div>
    </div>

    <div class="settings-group">
      <div class="section-label">About</div>
      <div class="settings-row"><div>Aurora Reader</div><div class="row-sub">v1.0.0</div></div>
    </div>
  `;
}

export async function toggleKeepScreenOn() {
  const s = await storageService.getSettings();
  await storageService.saveSettings({ keepScreenOn: !s.keepScreenOn });
  renderSettings();
}

export async function toggleScanOnLaunch() {
  const s = await storageService.getSettings();
  await storageService.saveSettings({ scanOnLaunch: !s.scanOnLaunch });
  renderSettings();
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

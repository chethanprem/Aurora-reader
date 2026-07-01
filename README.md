# Aurora Reader

A local PDF/book reader for Android — built with Capacitor, pdf.js, and a
plain modular JS front end (no bundler required). Import PDFs already on
your phone, read them in a proper book UI (themes, highlights, bookmarks,
adjustable type), and build an installable APK straight from GitHub Actions.

Design reference: the "Aurora Reader" board (purple accent, dark shell,
Light/Sepia/Dark/Black reading themes, appearance bottom sheet).

## What it does

- **Local file import** — native file picker to pull PDFs from Downloads,
  Google Drive-synced folders, or anywhere else on the device. Files are
  copied into the app's private storage so the library keeps working even
  if the original is moved.
- **Device scan** — optional scan of Documents/Downloads for PDFs you
  haven't imported yet (Settings → "Scan device storage now").
- **Real book reader** — pdf.js renders each page to canvas with a
  selectable text layer, so you can actually select and highlight text,
  not just look at a flat image.
- **Highlights & notes** — select text → colored highlight or note,
  saved per book and browsable from the Notes tab.
- **Bookmarks** — star any page, jump back to it later.
- **Appearance** — Light / Sepia / Dark / Black reading themes, 4 accent
  colors, font size, line spacing, page style, and margins — all persisted
  and re-applied automatically next time you open a book.
- **Reading progress** — tracked per book, shown as a % badge on the
  library grid and on the Home "Continue Reading" card.

## Project structure

```
aurora-reader/
├── src/
│   ├── index.html              # app shell: screens, bottom nav, sheet, toast
│   ├── css/
│   │   ├── main.css            # design tokens + shell layout (nav/topbar/cards)
│   │   ├── themes.css          # the 4 reading themes + accent colors
│   │   └── reader.css          # reader screen, thumbnails, appearance sheet
│   └── js/
│       ├── app.js              # boot, screen router, one delegated click handler
│       ├── services/
│       │   ├── storageService.js   # library/highlights/bookmarks/settings persistence
│       │   ├── fileService.js      # native file picker + device scanning
│       │   └── pdfService.js       # pdf.js wrapper: load/render/thumbnails
│       ├── screens/
│       │   ├── home.js
│       │   ├── library.js
│       │   ├── reader.js
│       │   ├── notes.js
│       │   └── settings.js
│       └── components/
│           ├── bookCard.js         # grid card / list row renderers
│           └── themePicker.js      # Appearance bottom-sheet UI + apply logic
├── capacitor.config.json
├── package.json
└── .github/workflows/build-apk.yml # CI: builds a debug APK on every push to main
```

Every screen owns its own render function and reads/writes through
`storageService`/`fileService`/`pdfService` — no screen talks to
`localStorage` or `pdf.js` directly. That's the seam to extend along
(e.g. add `epubService.js` next to `pdfService.js` for EPUB support
without touching the screens).

## Local setup

```bash
npm install
npx cap add android      # first time only — generates the android/ folder
npx cap sync android
```

After the `android/` folder is generated once, **add these permissions**
to `android/app/src/main/AndroidManifest.xml` (inside `<manifest>`, above
`<application>`) so the file picker and device scan work:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
```

Then commit the `android/` folder (build outputs are gitignored, the
project itself isn't) so CI doesn't have to regenerate it and your manifest
edits stick.

To run on a connected device/emulator:

```bash
npx cap open android     # opens Android Studio — Run ▶
```

## Building the APK on GitHub

1. Push this repo to GitHub.
2. `.github/workflows/build-apk.yml` runs automatically on every push to
   `main` (or trigger it manually from the **Actions** tab).
3. It installs dependencies, syncs Capacitor, builds a debug APK with
   Gradle, and:
   - uploads it as a workflow **artifact** (Actions → the run → Artifacts), and
   - attaches it to a new **GitHub Release** tagged `build-<run number>`.

Download the APK from either place and sideload it — same flow as your
other Capacitor apps.

## Roadmap / extension points

- `fileService.js` and `pdfService.js` are the only two files that know
  about "PDF" specifically — an `epubService.js` alongside them (using
  epub.js) plus a format switch in `reader.js` is the cleanest way to add
  EPUB support.
- Cloud sync (Drive) can hook into `storageService.js` the same way it did
  in Aura Music — mirror the library/highlights JSON to Drive on save.
- `pdfService.renderPage` re-renders the whole page on navigation; for
  very large PDFs, pre-rendering the next page in the background would
  make forward navigation feel instant.

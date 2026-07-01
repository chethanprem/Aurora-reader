// =====================================================
// build.js
// Aurora Reader ships as modular ES files under src/js for
// readability, but a plain <script type="module"> can't resolve
// bare npm specifiers like "@capacitor/preferences" in a WebView.
// This script bundles src/js/app.js (and everything it imports,
// including the Capacitor plugin packages) into a single file with
// esbuild, then assembles the final www/ folder that Capacitor's
// webDir points to. Source stays structured; only the build output
// is a single file.
// =====================================================
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, 'www');

function emptyDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

async function build() {
  emptyDir(OUT);

  // 1. Bundle the app's JS (resolves @capacitor/* imports into the bundle)
  await esbuild.build({
    entryPoints: [path.join(SRC, 'js', 'app.js')],
    bundle: true,
    format: 'esm',
    target: 'es2020',
    outfile: path.join(OUT, 'js', 'app.bundle.js'),
    logLevel: 'info',
  });

  // 2. Copy static assets (css, icons if any)
  copyDir(path.join(SRC, 'css'), path.join(OUT, 'css'));

  // 3. Copy index.html, pointing the module script at the bundle
  let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  html = html.replace(
    '<script type="module" src="js/app.js"></script>',
    '<script type="module" src="js/app.bundle.js"></script>'
  );
  fs.writeFileSync(path.join(OUT, 'index.html'), html);

  console.log('✔ Build complete → www/');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});

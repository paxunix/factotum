const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');
const outDir = path.join(root, 'dist');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyStaticFiles() {
  const exts = new Set(['.html', '.css', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.json', '.mjs']);

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (exts.has(ext)) {
          const rel = path.relative(srcDir, full);
          const dest = path.join(outDir, rel);
          copyFile(full, dest);
        }
      }
    }
  };

  walk(srcDir);
}

function copyWebAwesomeAssets() {
  const webAwesomeDist = path.join(root, 'node_modules', '@awesome.me', 'webawesome', 'dist');
  const out = path.join(outDir, 'vendor', 'webawesome');
  if (!fs.existsSync(webAwesomeDist)) {
    console.warn('Web Awesome dist not found. Run npm install before build.');
    return;
  }

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.isFile()) {
        const rel = path.relative(webAwesomeDist, full);
        const dest = path.join(out, rel);
        copyFile(full, dest);
      }
    }
  };

  walk(webAwesomeDist);
}

function copyMaterialSymbolsAssets() {
  const materialSymbolsDir = path.join(root, 'node_modules', 'material-symbols');
  const out = path.join(outDir, 'vendor', 'material-symbols');
  const files = ['material-symbols-outlined.woff2'];
  if (!fs.existsSync(materialSymbolsDir)) {
    console.warn('Material Symbols assets not found. Run npm install before build.');
    return;
  }

  for (const file of files) {
    copyFile(path.join(materialSymbolsDir, file), path.join(out, file));
  }
}

function copyRootAssets() {
  copyFile(path.join(root, 'manifest.json'), path.join(outDir, 'manifest.json'));

  const iconsDir = path.join(root, 'icons');
  if (fs.existsSync(iconsDir)) {
    for (const entry of fs.readdirSync(iconsDir, { withFileTypes: true })) {
      if (entry.isFile()) {
        copyFile(
          path.join(iconsDir, entry.name),
          path.join(outDir, 'icons', entry.name)
        );
      }
    }
  }

  const localesDir = path.join(root, '_locales');
  if (fs.existsSync(localesDir)) {
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (entry.isFile()) {
          const rel = path.relative(root, full);
          copyFile(full, path.join(outDir, rel));
        }
      }
    };
    walk(localesDir);
  }
}

async function buildMain() {
  fs.rmSync(outDir, { recursive: true, force: true });
  ensureDir(outDir);

  await esbuild.build({
    entryPoints: [
      'src/sw/sw.js',
      'src/overlay/overlay.js',
      'src/bridge/main_host.js',
      'src/ui/manager.js',
      'src/ui/popup.js'
    ],
    outdir: 'dist',
    outbase: 'src',
    bundle: true,
    format: 'iife',
    target: ['chrome114'],
    sourcemap: true
  });

  copyStaticFiles();
  copyRootAssets();
  copyWebAwesomeAssets();
  copyMaterialSymbolsAssets();
}
buildMain().catch((err) => {
  console.error(err);
  process.exit(1);
});

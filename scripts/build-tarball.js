const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { buildRelease, releaseDir, root } = require('./build.js');

async function buildTarball() {
  await buildRelease();

  const { version, name } = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
  );
  const archiveBaseName = `${name}-${version}`;
  const archivePath = path.join(releaseDir, `${archiveBaseName}.tar.gz`);
  const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'factotum-release-'));
  const stagingDir = path.join(stagingRoot, archiveBaseName);

  fs.rmSync(archivePath, { force: true });
  fs.cpSync(releaseDir, stagingDir, {
    recursive: true,
    filter(src) {
      return src !== archivePath;
    }
  });

  try {
    execFileSync(
      'tar',
      ['-czf', archivePath, '-C', stagingRoot, archiveBaseName],
      { stdio: 'inherit' }
    );
    console.log(`Created ${path.relative(root, archivePath)}`);
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}

buildTarball().catch((err) => {
  console.error(err);
  process.exit(1);
});

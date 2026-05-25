const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { buildMain, outDir, root } = require('./build.js');

async function buildTarball() {
  await buildMain();

  const { version, name } = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
  );
  const releaseDir = path.join(root, 'release');
  const archiveBaseName = `${name}-${version}`;
  const stagingDir = path.join(releaseDir, archiveBaseName);
  const archivePath = path.join(releaseDir, `${archiveBaseName}.tar.gz`);

  fs.rmSync(stagingDir, { recursive: true, force: true });
  fs.rmSync(archivePath, { force: true });
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.cpSync(outDir, stagingDir, { recursive: true });

  execFileSync(
    'tar',
    ['-czf', archivePath, '-C', releaseDir, archiveBaseName],
    { stdio: 'inherit' }
  );

  fs.rmSync(stagingDir, { recursive: true, force: true });
  console.log(`Created ${path.relative(root, archivePath)}`);
}

buildTarball().catch((err) => {
  console.error(err);
  process.exit(1);
});

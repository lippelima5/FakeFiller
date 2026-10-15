import { build } from 'esbuild';
import { mkdir, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url),
  out = new URL('dist/', root);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const name of ['manifest.json', 'popup.html', 'styles.css', 'icons'])
  await cp(new URL(name, root), new URL(name, out), { recursive: true });
await build({
  absWorkingDir: fileURLToPath(root),
  entryPoints: ['popup.ts', 'background.ts'],
  outdir: 'dist',
  bundle: true,
  format: 'esm',
  target: 'chrome120',
  minify: true,
  legalComments: 'none',
});
await build({
  absWorkingDir: fileURLToPath(root),
  entryPoints: ['content.ts'],
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  minify: true,
  legalComments: 'none',
});
console.log('Production extension: dist/');

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORTAL_ROOT = path.resolve(__dirname, '..', '..', '..');

function extractLocalAssets(htmlContent) {
  const regex = /(?:src|href)="([^"]+)"/g;
  const results = [];
  let match;
  while ((match = regex.exec(htmlContent)) !== null) {
    const ref = match[1];
    if (
      ref.startsWith('http://') ||
      ref.startsWith('https://') ||
      ref.startsWith('#') ||
      ref.startsWith('about:') ||
      ref.startsWith('data:')
    ) {
      continue;
    }
    results.push(ref);
  }
  return results;
}

test('REG-01: Todas las rutas registradas en script.js (las 5 OVAs previas + MiniOpt) existen en disco', () => {
  const scriptPath = path.join(PORTAL_ROOT, 'script.js');
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');

  const routeRegex = /'([^']+)':\s*\{[\s\S]*?path:\s*'([^']+)'/g;
  const routes = [];
  let m;
  while ((m = routeRegex.exec(scriptContent)) !== null) {
    routes.push({ slug: m[1], relPath: m[2] });
  }

  assert.equal(routes.length, 6, 'Deben existir las 6 OVAs registradas (5 previas + mini-opt)');
  assert.ok(routes.some(r => r.slug === 'mini-opt'), 'Debe estar registrada la ruta mini-opt');

  for (const r of routes) {
    const full = path.join(PORTAL_ROOT, r.relPath);
    assert.ok(fs.existsSync(full), `Falta el archivo de la OVA '${r.slug}': ${r.relPath}`);
  }
});

test('REG-02: Todos los recursos locales en index.html del portal resuelven correctamente', () => {
  const indexPath = path.join(PORTAL_ROOT, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf-8');
  const assets = extractLocalAssets(html);

  assert.ok(assets.length > 0);
  for (const ref of assets) {
    const target = path.resolve(PORTAL_ROOT, ref);
    assert.ok(fs.existsSync(target), `Recurso roto en index.html: ${ref}`);
  }

  assert.ok(html.includes('href="#/ova/mini-opt"'), 'index.html debe enlazar a #/ova/mini-opt');
  assert.ok(html.includes('id="details-ova-6-modal"'), 'index.html debe incluir el modal de detalles de MiniOpt');
  assert.ok(html.includes('id="card-ova-6"'), 'index.html debe incluir la tarjeta de MiniOpt');
});

test('REG-03: Todos los recursos relativos de OVAS/MiniOpt/index.html resuelven correctamente', () => {
  const miniOptDir = path.join(PORTAL_ROOT, 'OVAS', 'MiniOpt');
  const html = fs.readFileSync(path.join(miniOptDir, 'index.html'), 'utf-8');
  const assets = extractLocalAssets(html);

  assert.ok(assets.includes('../shared/usb-ova-tokens.css'));
  assert.ok(assets.includes('../shared/usb-ova-components.css'));
  assert.ok(assets.includes('../shared/usb-ova-theme.js'));
  assert.ok(assets.includes('css/miniopt.css'));
  assert.ok(assets.includes('js/optimizer.js'));
  assert.ok(assets.includes('js/app.js'));

  for (const ref of assets) {
    const target = path.resolve(miniOptDir, ref);
    assert.ok(fs.existsSync(target), `Recurso roto en OVAS/MiniOpt/index.html: ${ref}`);
  }
});

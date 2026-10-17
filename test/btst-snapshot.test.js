// BTST saves the bars each run tested on (dated, hashed), and replay reruns a rule on exactly those bars.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.QT_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'qt-btst-'));
const bars = JSON.parse(fs.readFileSync(new URL('./fixtures/btc-1d.json', import.meta.url), 'utf8'));
const { saveSnapshot, loadSnapshot, barsHash, default: btst } = await import('../lib/fn/btst.js');

test('a snapshot is saved once per set of bars and replays to the same result', async () => {
  const snap = saveSnapshot({ symbol: 'BTCUSDT', provider: 'test' }, '1D', bars);
  assert.equal(snap.barsSha256, barsHash(bars));
  assert.equal(saveSnapshot({ symbol: 'BTCUSDT', provider: 'test' }, '1D', bars).id, snap.id);
  const a = await btst({ replay: snap.id, strategy: '1' });
  const b = await btst({ replay: snap.id, strategy: '1' });
  assert.deepEqual(a.results, b.results);
  assert.equal(a.snapshot.barsSha256, snap.barsSha256);
  assert.equal(a.bars, bars.length);
});

test('a snapshot edited after saving is refused', () => {
  const snap = saveSnapshot({ symbol: 'ETH', provider: 'test' }, '1D', bars.slice(0, 400));
  const file = path.join(process.env.QT_DATA_DIR, snap.file);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.bars[10].close += 1;
  fs.writeFileSync(file, JSON.stringify(j));
  assert.throws(() => loadSnapshot(snap.id), /changed since it was saved/);
  assert.throws(() => loadSnapshot('../x'), /snapshot id/);
});

// The LIVE switch on WEI, GLCO and GP: which way a cell flashes, and how a live price folds into the last bar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { tickClass, liveBar } from "../public/js/ui.js";

test("a price that rose flashes green, one that fell flashes red, an unchanged or first price doesn't flash", () => {
  assert.equal(tickClass(100, 101), "flash-up");
  assert.equal(tickClass(100, 99.5), "flash-down");
  assert.equal(tickClass(100, 100), "");
  assert.equal(tickClass(undefined, 100), "");
  assert.equal(tickClass(100, null), "");
});

test("a live price moves the close and stretches the bar's high and low", () => {
  const bar = { time: 1, open: 10, high: 12, low: 9, close: 11 };
  assert.deepEqual(liveBar(bar, 13), { time: 1, open: 10, high: 13, low: 9, close: 13 });
  assert.deepEqual(liveBar(bar, 8), { time: 1, open: 10, high: 12, low: 8, close: 8 });
  assert.deepEqual(liveBar(bar, 10.5), { ...bar, close: 10.5 });
  assert.equal(liveBar(bar, NaN), bar);
  assert.equal(liveBar(bar, 0), bar);
});
